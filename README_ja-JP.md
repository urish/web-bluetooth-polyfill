# Windows 10 向け Web Bluetooth Polyfill

<!-- The Polyfill enables Web Bluetooth in Chrome on Windows 10.  -->
Windows10のChrome上で、 Web Bluetooth を有効にするのが、この Polyfill です。

[![Build Status](https://travis-ci.org/urish/web-bluetooth-polyfill.png?branch=master)](https://travis-ci.org/urish/web-bluetooth-polyfill)

## インストール方法

<!--
1. You need to have Windows 10 Creators Update (version 1703 / build 15063) or newer
2. You also need [Visual C++ Redistributable for Visual Studio 2015 (x86)](https://www.microsoft.com/en-us/download/details.aspx?id=48145), if not already installed
3. Clone this repo: `git clone https://github.com/urish/web-bluetooth-polyfill`
4. Open Chrome Extensions pane (chrome://extensions/) and enable "Developer Mode" (there is a checkbox on top of the page)
5. Click the "Load unpacked extension..." button
6. Choose the `extension` folder inside the cloned repo
7. Take a note of the extension ID for the newly added extension, you will need it in step 9. The ID is a long string of lowercase english letters, e.g. `mfjncijdfecdpkfldkechgoadojddehp`
8. Download the latest [BLEServer](https://github.com/urish/web-bluetooth-polyfill/releases/) and unpack it inside `C:\Program Files (x86)\Web Bluetooth Polyfill`
9. Edit `C:\Program Files (x86)\Web Bluetooth Polyfill\manifest.json` and change the extension id in the `allowed_origins` section to match the extension ID you found in step 7
10. Run `C:\Program Files (x86)\Web Bluetooth Polyfill\register.cmd` to register the Native Messaging server
-->

1. 動作環境として、Windows 10 Creators Update (version 1703 / build 15063) 以上が必要です。（訳注：一連のインストール作業には、ユーザーに管理者権限が必要です。）
2. [Visual Studio 2015 の Visual C++ 再頒布可能パッケージ](https://www.microsoft.com/ja-JP/download/details.aspx?id=48145) がインストールされていなければ、インストールします。
3. gitでクローンを取得します。取得コマンド: `git clone https://github.com/urish/web-bluetooth-polyfill` (訳注：もしくは、[ZIPファイル(master.zip)](https://github.com/urish/web-bluetooth-polyfill/archive/master.zip)をダウンロードし、展開します。)
4. Chromeの拡張機能を開き (`chrome://extensions/`) 、"デベロッパーモード"を有効にします。 (スイッチがページの右上にあります。)
5. "パッケージ化されていない拡張機能を読み込む"のリンクボタンをクリックします。
6. 取得したクローン内にある `extension` フォルダーを選択します。(訳注：もしくは、ZIPファイルを展開したフォルダー内の `extension` フォルダーを選択します。)
7. 新たに追加された拡張機能に拡張機能IDが表示されていますので、このIDをメモします（コピー可）。このIDは、後続の手順で使用します。IDは、長い英字の文字列(すべて小文字)です。例： `mfjncijdfecdpkfldkechgoadojddehp`
8. 最新の [BLEServer](https://github.com/urish/web-bluetooth-polyfill/releases/) をダウンロードし、展開します。展開したフォルダー内のファイルを `C:\Program Files (x86)\Web Bluetooth Polyfill` へコピーします。（訳注：管理者実行権限が必要です。）
9. `C:\Program Files (x86)\Web Bluetooth Polyfill\manifest.json` を編集し、 `allowed_origins` セクション内に記述されている拡張機能IDを前述でメモしたIDに置き換え、保存します。（訳注：管理者実行権限が必要です。）
10. `C:\Program Files (x86)\Web Bluetooth Polyfill\register.cmd` を実行すると、拡張機能がレジストリーに登録されます。（訳注：「管理者として実行...」で実行します。）

That's it! Enjoy Web Bluetooth on Windows :-)

## トラブルシューティング(Troubleshooting)

⇒ [Troubleshooting (英語)](https://github.com/urish/web-bluetooth-polyfill/blob/master/README.md#troubleshooting)]を参照してください。

## 現在の開発状況(Current State)

⇒ [Current State (英語)](https://github.com/urish/web-bluetooth-polyfill/blob/master/README.md#current-state)]を参照してください。

## テストの実行方法

<!--
If you want to run tests, during local development, you will need [node.js](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/en/). Then, run the following commands:

    yarn
    yarn test
    
You can also run the tests in watch mode, which will only run tests related to files changed since the last commit:

    yarn run test:watch

-->

ローカルの開発環境でテストを実行する場合、[node.js](https://nodejs.org/en/) と [yarn](https://yarnpkg.com/en/)のインストールが必要です。
インストール後、次のコマンドでテストを実行します。

    yarn
    yarn test
    
You can also run the tests in watch mode, which will only run tests related to files changed since the last commit:

    yarn run test:watch
