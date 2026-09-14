# HSK Recall

Build faster Chinese word recall with focused practice, full-deck reviews, and offline listening quizzes. HSK Recall is an Android app with **1,200 vocabulary entries across classic HSK 1–4**, bundled Mandarin audio, and progress that stays on your device.

[Download the latest APK](https://github.com/Musawer1214/HSK-Mandarin-Chinese-Practice/releases/latest)

## Practice modes

- **Focused recall:** practise 20 words, reveal pinyin and English, then rate your recall. Mixed rounds emphasize HSK 4.
- **Full-deck review:** see every word in a level once, in shuffled order. Unfinished rounds resume when you reopen the app.
- **Weak-word practice:** hesitant and missed words stay available for targeted review. Three confident recalls in separate rounds move a word to Secure.
- **Listening quizzes:** hear a word, then choose its Chinese form and English meaning. Listening history is tracked separately from recall.
- **Vocabulary library:** filter by level and search Chinese, pinyin, or English.

| Deck | Entries |
| --- | ---: |
| HSK 1 | 150 |
| HSK 2 | 150 |
| HSK 3 | 300 |
| HSK 4 | 600 |
| **Total** | **1,200** |

These are vocabulary entries, including multi-character words and level-specific meanings. The deck follows the classic syllabus, not HSK 3.0.

## Install and update

1. Download the APK from [Releases](https://github.com/Musawer1214/HSK-Mandarin-Chinese-Practice/releases/latest).
2. Open it on an Android 9 or newer device and allow installation from your chosen browser or file manager if prompted.
3. For updates, install the new APK over the existing app to retain progress. Do not uninstall first.

The app's **Help & backups → Check updates on GitHub** button opens the release page. Practice and pronunciation work offline; checking for updates requires Internet access.

## Local progress and backups

Recall ratings, weak words, listening history, and unfinished rounds are saved on the phone. Progress is not uploaded to GitHub or synchronized with the laptop app.

Use **Help & backups** to export or import a JSON backup. Imports merge ratings while preserving newer records. Export before uninstalling or clearing app data.

## Project structure

| Path | Purpose |
| --- | --- |
| `web/` | Shared recall interface and HSK 1–3 vocabulary |
| `android/app/` | Native Android shell, resources, and bundled audio |
| `android/hsk4.cjs` | HSK 4 vocabulary extension and interface integration |
| `android/vocabulary/` | Source data, official-list comparison, and corrections |
| `android/listening.js` | Listening quiz and independent scoring |
| `android/prepare-assets.cjs` | Packages the shared interface for Android |
| `android/tests/` | Native instrumentation tests |

## Build from source

The build scripts target Windows and require Node.js, Python 3, JDK 17, Android SDK platform 36, and Android build tools 35.0.0. Place the tools beneath `android/toolchain/`:

```text
jdk/jdk-*/
packages/build-tools_35.0.0/android-15/
packages/platforms_android-36/   # contains android.jar
```

Build the APK:

```powershell
python android/build.py
```

The signed APK is written to `android/release/`. The first build creates a local signing key. Keep that key for compatible updates; a different key cannot update an existing installation. Toolchains, signing keys, generated builds, and saved progress are excluded from the repository.

## Validation

Run the vocabulary and packaged interface checks on Windows with Microsoft Edge installed:

```powershell
npm ci
npm test
```

Validate the built APK and audio files with FFprobe available on your PATH:

```powershell
python android/verify-package.py
```

Version 1.3.1 checks cover all four decks, offline playback, quiz scoring, saved progress, backup export, mobile layout, and resuming HSK 4 after 345 answers. This version has not been tested on an emulator or physical phone. See [validation details](android/VALIDATION-1.3.1.md).

## Vocabulary and audio

All 600 HSK 4 headwords match entries 601–1200 in the [official classic vocabulary list](https://www.chinesetest.cn/userfiles/file/cihui.pdf). See [vocabulary sources and corrections](android/vocabulary/README.md) for the comparison method and third-party data license.

Pronunciation is synthesized Mandarin using Microsoft Huihui. Headword coverage is verified; English definitions and individual audio pronunciations have not received an exhaustive linguistic audit.
