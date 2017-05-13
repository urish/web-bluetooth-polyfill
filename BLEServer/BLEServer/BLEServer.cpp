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

void processCommand(JsonObject ^command) {
	String ^cmd = command->GetNamedString("cmd", "");

	if (cmd->Equals("ping")) {
		JsonObject^ msg = ref new JsonObject();
		msg->Insert("_type", JsonValue::CreateStringValue("Pong"));
		writeObject(msg);
	}

	if (cmd->Equals("scan")) {
		bleAdvertisementWatcher->Start();
	}
	
	if (cmd->Equals("stopScan")) {
		bleAdvertisementWatcher->Stop();
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
		msg->Insert("_type", JsonValue::CreateStringValue("ScanResult"));
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
	while (1) {
		unsigned int len = 0;
		std::cin.read(reinterpret_cast<char *>(&len), 4);
		if (len > 0) {
			char *msgBuf = new char[len];
			std::cin.read(msgBuf, len);
			String^ jsonStr = ref new String(convert.from_bytes(msgBuf, msgBuf+len).c_str());
			delete[] msgBuf;
			JsonObject^ json = JsonObject::Parse(jsonStr);
			processCommand(json);
		}
	}

	return 0;
}
