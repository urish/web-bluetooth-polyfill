// BLEServer.cpp : Windows 10 Web Bluetooth Polyfill Server
//
// Copyright (C) 2017, Uri Shaked. License: MIT.
//

#include "stdafx.h"
#include <iostream>
#include <Windows.Foundation.h>
#include <Windows.Devices.Bluetooth.h>
#include <Windows.Devices.Bluetooth.Advertisement.h>
#include <Windows.Data.JSON.h>
#include <wrl/wrappers/corewrappers.h>
#include <wrl/event.h>
#include <collection.h>
#include <ppltasks.h>
#include <string>
#include <sstream> 
#include <iomanip>
#include <experimental/resumable>
#include <pplawait.h>
#include <cvt/wstring>
#include <codecvt>
#include <stdio.h>  
#include <fcntl.h>  
#include <io.h>  

using namespace Platform;
using namespace Windows::Devices;
using namespace Windows::Data::Json;

Bluetooth::Advertisement::BluetoothLEAdvertisementWatcher^ bleAdvertisementWatcher;
auto devices = ref new Collections::Map<String^, Bluetooth::BluetoothLEDevice^>();

std::wstring formatBluetoothAddress(unsigned long long BluetoothAddress) {
	std::wostringstream ret;
	ret << std::hex << std::setfill(L'0')
		<< std::setw(2) << ((BluetoothAddress >> (5 * 8)) & 0xff) << ":"
		<< std::setw(2) << ((BluetoothAddress >> (4 * 8)) & 0xff) << ":"
		<< std::setw(2) << ((BluetoothAddress >> (3 * 8)) & 0xff) << ":"
		<< std::setw(2) << ((BluetoothAddress >> (2 * 8)) & 0xff) << ":"
		<< std::setw(2) << ((BluetoothAddress >> (1 * 8)) & 0xff) << ":"
		<< std::setw(2) << ((BluetoothAddress >> (0 * 8)) & 0xff);
	return ret.str();
}

Guid parseUuid(String^ uuid) {
	if (uuid->Length() == 4) {
		unsigned int uuidShort = std::stoul(uuid->Data(), 0, 16);
		return Bluetooth::BluetoothUuidHelper::FromShortId(uuidShort);
	}
	GUID rawguid;
	if (SUCCEEDED(IIDFromString(uuid->Data(), &rawguid))) {
		return Guid(rawguid);
	}
	else {
		std::wstring msg = L"Invalid UUID: ";
		msg += uuid->Data();
		throw ref new Platform::InvalidArgumentException(ref new Platform::String(msg.c_str()));
	}
}

void writeObject(JsonObject^ jsonObject) {
	String^ jsonString = jsonObject->Stringify();

	stdext::cvt::wstring_convert<std::codecvt_utf8<wchar_t>> convert;
	std::string stringUtf8 = convert.to_bytes(jsonString->Data());

	auto len = stringUtf8.length();
	std::cout << char(len >> 0)
		<< char(len >> 8)
		<< char(len >> 16)
		<< char(len >> 24);

	std::cout << stringUtf8 << std::flush;
}

concurrency::task<IJsonValue^> connectRequest(JsonObject ^command) {
	String ^addressStr = command->GetNamedString("address", "");
	unsigned long long address = std::stoull(addressStr->Data(), 0, 16);
	auto device = co_await Bluetooth::BluetoothLEDevice::FromBluetoothAddressAsync(address);
	if (device == nullptr) {
		throw ref new Platform::FailureException(ref new Platform::String(L"Device not found (null)"));
	}
	devices->Insert(device->DeviceId, device);
	return JsonValue::CreateStringValue(device->DeviceId);
}

concurrency::task<Bluetooth::GenericAttributeProfile::GattDeviceServicesResult^> findServices(JsonObject ^command) {
	String ^deviceId = command->GetNamedString("device", "");
	Bluetooth::BluetoothLEDevice^ device = devices->Lookup(deviceId);
	if (device == nullptr) {
		throw ref new Platform::FailureException(ref new Platform::String(L"Device not found"));
	}
	if (command->HasKey("service")) {
		return co_await device->GetGattServicesForUuidAsync(parseUuid(command->GetNamedString("service")));
	}
	else {
		return co_await device->GetGattServicesAsync();
	}
}

concurrency::task<IJsonValue^> servicesRequest(JsonObject ^command) {
	auto servicesResult = co_await findServices(command);
	auto result = ref new JsonArray();
	for (unsigned int i = 0; i < servicesResult->Services->Size; i++) {
		result->Append(JsonValue::CreateStringValue(servicesResult->Services->GetAt(i)->Uuid.ToString()));
	}
	return result;
}

concurrency::task<IJsonValue^> charactersticsRequest(JsonObject ^command) {
	if (!command->HasKey("service")) {
		throw ref new Platform::InvalidArgumentException(ref new Platform::String(L"Service uuid must be provided"));
	}
	auto servicesResult = co_await findServices(command);
	auto services = servicesResult->Services;
	if (services->Size == 0) {
		throw ref new Platform::FailureException(ref new Platform::String(L"Requested service not found"));
	}
	auto service = services->GetAt(0);
	auto characteristicsResult = co_await service->GetCharacteristicsAsync();
	auto result = ref new JsonArray();
	for (unsigned int i = 0; i < characteristicsResult->Characteristics->Size; i++) {
		result->Append(JsonValue::CreateStringValue(characteristicsResult->Characteristics->GetAt(i)->Uuid.ToString()));
	} 
	return result;
}

concurrency::task<IJsonValue^> writeRequest(JsonObject ^command) {
	if (!command->HasKey("service")) {
		throw ref new InvalidArgumentException(ref new String(L"Service uuid must be provided"));
	}
	if (!command->HasKey("data")) {
		throw ref new InvalidArgumentException(ref new String(L"Data must be provided"));
	}
	auto servicesResult = co_await findServices(command);
	auto services = servicesResult->Services;
	if (services->Size == 0) {
		throw ref new FailureException(ref new String(L"Requested service not found"));
	}
	auto service = services->GetAt(0);
	auto characteristicsResult = co_await service->GetCharacteristicsAsync();
	// TODO find correct characteristic
	auto characteristic = characteristicsResult->Characteristics->GetAt(0);

	auto writer = ref new Windows::Storage::Streams::DataWriter();
	auto dataArray = command->GetNamedArray("data");
	for (unsigned int i = 0; i < dataArray->Size; i++) {
		writer->WriteByte((unsigned char)dataArray->GetNumberAt(i));
	}

	auto status = co_await characteristic->WriteValueAsync(writer->DetachBuffer(), Bluetooth::GenericAttributeProfile::GattWriteOption::WriteWithoutResponse);
	if (status != Bluetooth::GenericAttributeProfile::GattCommunicationStatus::Success) {
		throw ref new FailureException(status.ToString());
	}

	return JsonValue::CreateNullValue();
}

concurrency::task<void> processCommand(JsonObject ^command) {
	String ^cmd = command->GetNamedString("cmd", "");
	JsonObject^ response = ref new JsonObject();
	IJsonValue^ result = nullptr;
	response->Insert("_type", JsonValue::CreateStringValue("response"));
	response->Insert("id", JsonValue::CreateStringValue(command->GetNamedString("_id", "")));

	try {
		if (cmd->Equals("ping")) {
			response->Insert("result", JsonValue::CreateStringValue("pong"));
			writeObject(response);
		}

		if (cmd->Equals("scan")) {
			bleAdvertisementWatcher->Start();
			result = JsonValue::CreateNullValue();
		}

		if (cmd->Equals("stopScan")) {
			bleAdvertisementWatcher->Stop();
			result = JsonValue::CreateNullValue();
		}

		if (cmd->Equals("connect")) {
			result = co_await connectRequest(command);
		}

		if (cmd->Equals("services")) {
			result = co_await servicesRequest(command);
		}

		if (cmd->Equals("characteristics")) {
			result = co_await charactersticsRequest(command);
		}

		if (cmd->Equals("write")) {
			result = co_await writeRequest(command);
		}

		if (result != nullptr) {
			response->Insert("result", result);
		}
		else {
			response->Insert("_error", JsonValue::CreateStringValue("Unknown command"));
		}
		writeObject(response);
	}
	catch (Platform::Exception^ e) {
		response->Insert("_error", JsonValue::CreateStringValue(e->ToString()));
		writeObject(response);
	}
	catch (...) {
		response->Insert("_error", JsonValue::CreateStringValue("Unknown error"));
		writeObject(response);
	}
}

int main(Array<String^>^ args) {
	Microsoft::WRL::Wrappers::RoInitializeWrapper initialize(RO_INIT_MULTITHREADED);

	CoInitializeSecurity(
		nullptr, // TODO: "O:BAG:BAD:(A;;0x7;;;PS)(A;;0x3;;;SY)(A;;0x7;;;BA)(A;;0x3;;;AC)(A;;0x3;;;LS)(A;;0x3;;;NS)"
		-1,
		nullptr,
		nullptr,
		RPC_C_AUTHN_LEVEL_DEFAULT,
		RPC_C_IMP_LEVEL_IDENTIFY,
		NULL,
		EOAC_NONE,
		nullptr);

	bleAdvertisementWatcher = ref new Bluetooth::Advertisement::BluetoothLEAdvertisementWatcher();
	bleAdvertisementWatcher->ScanningMode = Bluetooth::Advertisement::BluetoothLEScanningMode::Active;
	bleAdvertisementWatcher->Received += ref new Windows::Foundation::TypedEventHandler<Bluetooth::Advertisement::BluetoothLEAdvertisementWatcher ^, Windows::Devices::Bluetooth::Advertisement::BluetoothLEAdvertisementReceivedEventArgs ^>(
		[](Bluetooth::Advertisement::BluetoothLEAdvertisementWatcher ^watcher, Bluetooth::Advertisement::BluetoothLEAdvertisementReceivedEventArgs^ eventArgs) {
		unsigned int index = -1;

		JsonObject^ msg = ref new JsonObject();
		msg->Insert("_type", JsonValue::CreateStringValue("scanResult"));
		msg->Insert("bluetoothAddress", JsonValue::CreateStringValue(ref new String(formatBluetoothAddress(eventArgs->BluetoothAddress).c_str())));
		msg->Insert("rssi", JsonValue::CreateNumberValue(eventArgs->RawSignalStrengthInDBm));
		// TODO fix timestamp calculation
		msg->Insert("timestamp", JsonValue::CreateNumberValue((double)eventArgs->Timestamp.UniversalTime / 10000.0 + 11644480800000));
		msg->Insert("advType", JsonValue::CreateStringValue(eventArgs->AdvertisementType.ToString()));
		msg->Insert("localName", JsonValue::CreateStringValue(eventArgs->Advertisement->LocalName));

		JsonArray^ serviceUuids = ref new JsonArray();
		for (unsigned int i = 0; i < eventArgs->Advertisement->ServiceUuids->Size; i++) {
			serviceUuids->Append(JsonValue::CreateStringValue(eventArgs->Advertisement->ServiceUuids->GetAt(i).ToString()));
		}
		msg->Insert("serviceUuids", serviceUuids);

		// TODO manfuacturer data / flags / data sections ?
		writeObject(msg);
	});

	JsonObject^ msg = ref new JsonObject();
	msg->Insert("_type", JsonValue::CreateStringValue("Start"));
	writeObject(msg);

	// Set STDIN / STDOUT to binary mode
	if ((_setmode(0, _O_BINARY) == -1) || (_setmode(1, _O_BINARY) == -1)) {
		return -1;
	}

	stdext::cvt::wstring_convert<std::codecvt_utf8<wchar_t>> convert;
	try {
		while (1) {
			unsigned int len = 0;
			std::cin.read(reinterpret_cast<char *>(&len), 4);

			if (len > 0) {
				char *msgBuf = new char[len];
				std::cin.read(msgBuf, len);
				String^ jsonStr = ref new String(convert.from_bytes(msgBuf, msgBuf + len).c_str());
				delete[] msgBuf;
				JsonObject^ json = JsonObject::Parse(jsonStr);
				processCommand(json);
			}
		}
	}
	catch (std::exception &e) {
		JsonObject^ msg = ref new JsonObject();
		msg->Insert("_type", JsonValue::CreateStringValue("error"));
		std::string eReason = std::string(e.what());
		std::wstring wReason = std::wstring(eReason.begin(), eReason.end());
		msg->Insert("error", JsonValue::CreateStringValue(ref new String(wReason.c_str())));
		writeObject(msg);
	}

	return 0;
}
