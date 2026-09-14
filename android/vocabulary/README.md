# HSK 4 vocabulary provenance

The Android deck contains 600 classic HSK 4 entries. All headwords match entries 601–1200 of the official cumulative vocabulary list:
https://www.chinesetest.cn/userfiles/file/cihui.pdf

`official-hsk4-new.json` records those numbered entries for reproducible headword checks. Parenthetical grammatical labels are removed only when comparing headwords. Run `node android/verify-vocabulary.cjs` from the repository root.

Base pinyin/English data: https://github.com/clem109/hsk-vocabulary/blob/master/hsk-vocab-json/hsk-level-4.json (MIT, see LICENSE-source.txt). Downloaded September 14, 2026. The source contains 601 records and 598 distinct headwords. Exact repeated records for 等, 对 and 过 are deduplicated.

Corrections in hsk4.cjs add missing 只 (zhī, classifier) and 得 (děi, must/have to), replace 弹 with 弹钢琴, and distinguish 等 as a particle, 对 as an adjective, and 过 as a verb. Existing HSK 1–3 entries and IDs are unchanged. HSK 4 IDs stay stable across the preliminary 1.3.0 build and corrected 1.3.1 release.

The official list verifies membership and completeness, not every English definition or synthesized pronunciation. Audio uses Microsoft Huihui and is not official exam audio. This is the classic syllabus, not HSK 3.0.

## HSK Standard Course 4A/4B main vocabulary audit (1.4.0)

User-supplied scanned textbooks were checked against the application. Main New Words indexes: 4A printed pages 129–138 (PDF pages 141–150); 4B printed pages 141–150 (PDF pages 151–160). Windows Chinese OCR was used as an aid, followed by visual review and transcription of every headword row.

`hsk4-book-main.json` records 602 rows (300 in 4A, 302 in 4B), representing 601 distinct headwords; 省 appears twice with province/economize senses. The historical official list does not match the textbook indexes exactly. Of these headwords, 93 lacked an exact card in the existing HSK 1–4 app after removing parenthetical grammatical labels. Those are now in `hsk4-book-additions.json`, with concise authored English glosses and book/page references. Existing cards and IDs remain unchanged.

The app therefore has 693 HSK 4 cards (600 historical official-list entries plus 93 textbook additions) and 1,293 cards overall. This is combined coverage, not a claim that the official syllabus has 693 new words. All main textbook headwords are present. Supplementary lists, out-of-syllabus lists, and proper-noun lists are excluded. The PDFs and page images are not distributed in this repository.

Run `npm test` to verify official-list membership and coverage of every reviewed main textbook row. Membership tests do not constitute an exhaustive linguistic or pronunciation audit.
