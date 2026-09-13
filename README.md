# HSK Recall

A personal creation by **Musawer Hussain Orakzai**.

An offline Android app for recalling all 600 vocabulary words in classic HSK 1–3 (not HSK 3.0).

## Full-deck review

In Recall, choose **Round → Full HSK 1 (150), Full HSK 2 (150), or Full HSK 3 (300)**. Every word appears once in random order, including previously secure words. Missed and hesitant words are set aside and saved to your weak list. Unfinished decks resume after closing the app. Focused 20-word practice is still available.

## Features

- Chinese word recall with pinyin and English; extra HSK 3 practice in mixed rounds.
- Persistent weak words, unfinished rounds and per-level progress.
- Listening quiz: audio with four Chinese choices and four English meaning choices.
- Separate listening history prioritizes words needing practice.
- Compact mobile layout, bundled pronunciation and JSON backup import/export.

## Install and update

Download the APK from [GitHub Releases](https://github.com/Musawer1214/hsk-recall/releases/latest) and open it on your Android phone.

For updates, check GitHub Releases or use **Help & backups → Check updates on GitHub** in the app. Install official updates over your existing app; do not uninstall first. Export a backup for an extra copy.

The update link opens GitHub in your browser and needs Internet. It does not automatically download or install updates. Practice and audio remain offline.

## Progress and privacy

Progress is stored privately on your phone, separately from the laptop app. It is not uploaded to GitHub. Uninstalling or clearing app data removes it: export first.

## Build from source

`web/` contains the shared recall interface and vocabulary. `android/` contains the native Android shell, listening quiz, mobile layout, packaging scripts and 600 word recordings.

The build script targets Windows with Node.js, Python 3, JDK 17, Android SDK platform 36 and build tools 35.0.0. Install official tools into these local directories beneath `android/toolchain/`:

- `jdk/jdk-*/` — JDK 17
- `packages/build-tools_35.0.0/android-15/` — build tools 35.0.0
- `packages/platforms_android-36/` — a directory containing `android.jar`

Run `python android/build.py`. Output is written to `android/release/`. First build creates a private local signing key; keep it safe. A self-built APK cannot update the official app unless it uses the same signing key. SDKs, keys and personal progress are excluded from this repository.

For browser regression tests on Windows with Edge installed: run `npm install`, then `npm test`. Native instrumentation source is included under `android/tests/`; `python android/build-tests.py` builds it after the app build.

## Testing and attribution

Browser integration and Android 16 emulator tests cover offline audio, quiz scoring, filters, saved progress and update persistence. Not tested by the tooling on physical Samsung / One UI hardware.

Audio is synthesized Mandarin using Microsoft Huihui, not official exam recordings. This independent app is not affiliated with the HSK examination provider. Vocabulary and pronunciation have not received a complete linguistic audit.

## Ownership

Created by Musawer Hussain Orakzai. No open-source license is granted. Publishing this source does not waive applicable copyrights; third-party material remains subject to its own rights.
