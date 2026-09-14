# HSK 4 vocabulary provenance

The Android deck contains 600 classic HSK 4 entries. All headwords match entries 601–1200 of the official cumulative vocabulary list:
https://www.chinesetest.cn/userfiles/file/cihui.pdf

`official-hsk4-new.json` records those numbered entries for reproducible headword checks. Parenthetical grammatical labels are removed only when comparing headwords. Run `node android/verify-vocabulary.cjs` from the repository root.

Base pinyin/English data: https://github.com/clem109/hsk-vocabulary/blob/master/hsk-vocab-json/hsk-level-4.json (MIT, see LICENSE-source.txt). Downloaded September 14, 2026. The source contains 601 records and 598 distinct headwords. Exact repeated records for 等, 对 and 过 are deduplicated.

Corrections in hsk4.cjs add missing 只 (zhī, classifier) and 得 (děi, must/have to), replace 弹 with 弹钢琴, and distinguish 等 as a particle, 对 as an adjective, and 过 as a verb. Existing HSK 1–3 entries and IDs are unchanged. HSK 4 IDs stay stable across the preliminary 1.3.0 build and corrected 1.3.1 release.

The official list verifies membership and completeness, not every English definition or synthesized pronunciation. Audio uses Microsoft Huihui and is not official exam audio. This is the classic syllabus, not HSK 3.0.
