# Hà Tĩnh Immersive Audio Storytelling v1

**Status:** Editorial draft — NOT production-approved audio
**Scope:** 4 current immersive destinations / 19 current scenes
**Primary locale:** Vietnamese (`vi`)
**English:** optional later; never silently fallback EN → VI
**Runtime:** pre-generated file-backed narration only; no production runtime TTS

## 1. Purpose

This document is the editorial source of truth for the first immersive audio baseline. It gives each current scene a Vietnamese narration draft and gives each destination a distinct ambient-music direction.

It does NOT mean the audio files already exist. A script becomes publishable only after factual/editorial approval, voice selection, recording or approved pre-generation, rights/provenance capture, audio QA, and content versioning.

The runtime architecture remains generic. Scene slugs and destination names below are content records, not hard-coded business logic.

## 2. Global voice direction

Primary voice:

- calm Vietnamese storyteller;
- warm, cinematic, natural pacing;
- avoid advertising tone;
- avoid exaggerated emotion;
- respectful and restrained at memorial/historical locations;
- around 125–145 Vietnamese words/minute;
- short pauses after important spatial cues;
- pronounce place names clearly.

Narration target:

- major stop: roughly 25–45 seconds;
- connector/transition scene: roughly 10–20 seconds;
- Auto Tour may add a short settle before narration and a short hold after narration;
- Free Explore never autoplays narration.

## 3. Global ambient rules

- One main ambient track per destination is the baseline.
- Same main track MUST continue across ordinary scene changes without restarting.
- Narration ducks ambient to approximately 20–30% perceived level, then restores it smoothly.
- Ambient should loop cleanly and avoid a strong musical cadence that makes looping obvious.
- Avoid copyrighted commercial music unless explicit license/provenance is stored.
- Field recordings must also have recorded provenance/permission where required.
- No bomb/explosion dramatization at Đồng Lộc.
- No intrusive ritual/religious sound effects at Sơn Trang spiritual scenes.

---

# 4. Sơn Trang Cổ Đạm

Destination slug: `son-trang-co-dam`

Content position: deepest showcase. Eight current scenes receive narration. Four major stops carry the main story; four connector scenes are shorter transitions.

## Ambient direction — Main

**Working title:** `Mộc Sơn Trang`

Character:

- warm natural ambience;
- light leaves/wind/birds where appropriate;
- sparse Vietnamese acoustic/traditional texture used subtly, not as a theme song;
- slow, contemplative pulse;
- no vocal melody.

Loop target: 2–4 minutes.

## Optional ambient override — Ecology

**Working title:** `Sơn Trang — Mạch xanh`

- more natural texture;
- subtle water/leaves/insects only if they match the real site recording;
- minimal harmony;
- crossfade from main, then restore main when leaving ecology zone.

## Optional ambient override — Spiritual

**Working title:** `Sơn Trang — Khoảng tĩnh`

- quieter and more spacious;
- restrained low-frequency bed;
- no imitation of ceremonies;
- no synthetic “mystical” clichés.

### Scene ST01 — `son-trang-gate` — Cổng Sơn Trang

Role: major stop
Target: 30–35s

**VI narration draft**

> Chào mừng bạn đến với Sơn Trang Cổ Đạm. Từ cánh cổng này, hành trình không chỉ là đi từ điểm này sang điểm khác, mà là chậm lại để quan sát từng lớp không gian. Hãy để ý cách lối đi, cây xanh và những khoảng mở dẫn ánh nhìn vào bên trong. Bạn có thể tự do xoay góc nhìn, hoặc để Auto Tour đưa mình lần lượt qua các khu vực văn hóa, sinh thái và tâm linh của Sơn Trang.

Voice note: welcoming, understated.

### Scene ST02 — `son-trang-entrance-path` — Lối vào Sơn Trang

Role: connector
Target: 12–16s

**VI narration draft**

> Trên lối vào, nhịp trải nghiệm bắt đầu chậm lại. Hãy nhìn về phía trước và để ý sự chuyển tiếp từ cổng vào không gian trung tâm. Đây là đoạn nối ngắn, nhưng chính những khoảng chuyển như thế này giúp toàn bộ Sơn Trang hiện ra như một hành trình liền mạch thay vì những điểm đứng rời rạc.

### Scene ST03 — `son-trang-courtyard` — Sân trung tâm

Role: connector
Target: 18–22s

**VI narration draft**

> Từ sân trung tâm, nhiều hướng của Sơn Trang bắt đầu mở ra cùng lúc. Đây là nơi thích hợp để dừng vài giây, quan sát tương quan giữa công trình, lối đi và mảng xanh xung quanh. Khi sẵn sàng, bạn có thể tiếp tục tới không gian văn hóa — điểm dừng kể chuyện chính đầu tiên của hành trình.

### Scene ST04 — `son-trang-culture` — Không gian Văn hóa

Role: major stop
Target: 35–45s

**VI narration draft**

> Bạn đang ở không gian văn hóa của Sơn Trang. Thay vì chỉ lướt qua toàn cảnh, hãy chọn một vài chi tiết để quan sát thật kỹ: chất liệu, đồ vật, cách sắp đặt và những dấu vết gợi nhớ đời sống địa phương. Một không gian văn hóa trở nên có ý nghĩa khi những vật thể trước mắt được kết nối với câu chuyện của con người. Hãy xoay góc nhìn chậm rãi; những chi tiết nhỏ thường là phần dễ bị bỏ qua nhất trong một chuyến tham quan nhanh.

Editorial note: intentionally avoids unverified claims about specific artifacts until site-owner documentation is supplied.

### Scene ST05 — `son-trang-ecology-path` — Lối sinh thái

Role: connector
Target: 12–16s

**VI narration draft**

> Rời khu văn hóa, hành trình chuyển dần sang một nhịp xanh hơn. Trên lối sinh thái, hãy chú ý âm thanh và khoảng thở của cảnh quan. Nếu đang nghe bằng tai nghe, đây là nơi lớp ambient có thể mở rộng hơn một chút trước khi bạn bước vào điểm dừng sinh thái chính.

### Scene ST06 — `son-trang-ecology` — Không gian Sinh thái

Role: major stop
Target: 30–40s

**VI narration draft**

> Ở không gian sinh thái, câu chuyện được kể bằng cảnh quan nhiều hơn bằng công trình. Mảng xanh, ánh sáng, hướng gió và những khoảng trống tạo nên cảm giác khác hẳn khu văn hóa vừa đi qua. Hãy thử nhìn lên, nhìn xuống và xoay chậm một vòng để cảm nhận không gian bằng nhiều lớp. Đây cũng là điểm mà âm thanh tự nhiên nên được giữ nhẹ, để phần thuyết minh chỉ dẫn đường chứ không lấn át trải nghiệm tại chỗ.

### Scene ST07 — `son-trang-spiritual-path` — Lối tâm linh

Role: connector
Target: 12–16s

**VI narration draft**

> Từ đây, hành trình đi vào một khu vực cần nhịp chậm và yên hơn. Hãy giảm tốc độ quan sát, giữ âm lượng vừa phải và để khoảng lặng trở thành một phần của trải nghiệm. Điểm dừng tiếp theo là không gian tâm linh của Sơn Trang.

### Scene ST08 — `son-trang-spiritual` — Không gian Tâm linh

Role: major stop
Target: 30–40s

**VI narration draft**

> Bạn đang ở không gian tâm linh — điểm dừng có nhịp kể chậm nhất của hành trình Sơn Trang. Ở đây, trải nghiệm không cần quá nhiều lời. Hãy dành một khoảng lặng để quan sát bố cục, hướng nhìn và cảm giác tĩnh của không gian. Phần thuyết minh chỉ đóng vai trò mở ra sự chú ý; ý nghĩa sâu hơn của nơi này cần được tôn trọng theo câu chuyện và thực hành văn hóa mà chủ thể địa phương xác nhận.

Editorial note: final production wording requires site-owner review of cultural/religious terminology.

---

# 5. Biển Thiên Cầm

Destination slug: `bien-thien-cam`

Source-grounded facts used in drafts: Thiên Cầm is a major Hà Tĩnh coastal destination; local official/tourism sources describe the beach as a curved bay with fine sand and calm/clear water, with the tourism area extending for roughly 3 km.

## Ambient direction — Main

**Working title:** `Gió và sóng Thiên Cầm`

Character:

- real or licensed sea/wind field texture;
- wide stereo but comfortable on headphones;
- very sparse harmonic bed;
- avoid resort/lounge clichés;
- preserve natural wave rhythm.

Loop target: 3–5 minutes.

### Scene TC01 — `thien-cam-boardwalk` — Lối dạo Thiên Cầm

Role: major stop
Target: 28–35s

**VI narration draft**

> Chào mừng bạn đến Thiên Cầm, một trong những điểm du lịch biển nổi bật của Hà Tĩnh. Từ lối dạo này, đường cong của bờ biển bắt đầu hiện ra rõ hơn. Các nguồn địa phương mô tả khu vực Thiên Cầm với bãi cát mịn, mặt nước thoáng và dáng bờ biển uốn cong. Hãy đi chậm một chút, nghe tiếng sóng phía trước và dùng minimap nếu bạn muốn định hướng điểm dừng tiếp theo sát mép nước.

### Scene TC02 — `thien-cam-shore` — Bờ biển Thiên Cầm

Role: major stop
Target: 28–35s

**VI narration draft**

> Ở sát bờ biển, Thiên Cầm được cảm nhận rõ nhất qua ba lớp: gió, sóng và đường chân trời. Thay vì cố nhìn toàn bộ khung cảnh cùng lúc, hãy xoay chậm theo đường bờ rồi dừng ở nơi ánh sáng phản chiếu trên mặt nước. Khi lời kể kết thúc, hãy giữ tai nghe thêm vài giây — ở điểm dừng này, âm thanh tự nhiên của biển nên là nhân vật chính.

### Scene TC03 — `thien-cam-lookout` — Điểm ngắm Thiên Cầm

Role: major stop
Target: 25–32s

**VI narration draft**

> Từ điểm ngắm, toàn cảnh Thiên Cầm trở nên dễ đọc hơn: đường bờ cong, khoảng biển mở và nhịp chuyển giữa khu du lịch với cảnh quan tự nhiên. Đây là điểm kết thích hợp cho Auto Tour ngắn của Thiên Cầm. Trước khi rời đi, hãy xoay lại về phía bờ một lần nữa và chọn góc nhìn bạn muốn ghi nhớ nhất về vùng biển này.

### Thiên Cầm source notes

- Trang thông tin điện tử xã Thiên Cầm — giới thiệu chung: `https://thiencam.hatinh.gov.vn/vi/chuyen-muc/gioi-thieu-chung`
- Báo Hà Tĩnh — Cẩm nang du lịch biển Thiên Cầm: `https://baohatinh.vn/cam-nang-du-lich-bien-thien-cam-post308678.html`

Final recording must be checked against the approved destination fact sheet current at publication time.

---

# 6. Khu lưu niệm Nguyễn Du

Destination slug: `khu-luu-niem-nguyen-du`

Source-grounded facts used in drafts: the Nguyễn Du memorial complex in the Tiên Điền area is a Special National Relic; Hà Tĩnh sources describe a complex of more than 4 hectares containing multiple memorial components including museum/worship/memorial spaces connected with Nguyễn Du and his family tradition.

## Ambient direction — Main

**Working title:** `Tiên Điền — Trang sách`

Character:

- quiet heritage atmosphere;
- subtle plucked/string texture;
- no sung poetry or copyrighted literary performance;
- enough silence between phrases to support reading/transcript use;
- elegant rather than sentimental.

Loop target: 3–4 minutes.

### Scene ND01 — `nguyen-du-courtyard` — Sân khu lưu niệm Nguyễn Du

Role: major stop
Target: 32–40s

**VI narration draft**

> Bạn đang bước vào Khu lưu niệm Nguyễn Du tại vùng Tiên Điền, Hà Tĩnh. Đây là một quần thể di tích quốc gia đặc biệt gắn với Đại thi hào Nguyễn Du và không gian văn hóa của quê hương ông. Từ sân này, hãy xem toàn khu như một mạng lưới ký ức: kiến trúc, nơi tưởng niệm, tư liệu và cảnh quan cùng góp phần kể lại một di sản văn học đã vượt xa phạm vi của một địa phương.

### Scene ND02 — `nguyen-du-memorial-house` — Không gian nhà lưu niệm

Role: major stop
Target: 35–45s

**VI narration draft**

> Trong không gian nhà lưu niệm, câu chuyện nên bắt đầu từ con người trước khi đi tới tác phẩm. Nguyễn Du được biết đến rộng rãi với Truyện Kiều, nhưng giá trị của khu lưu niệm còn nằm ở việc đặt tác giả trở lại trong bối cảnh gia đình, quê hương và thời đại. Khi quan sát hiện vật hoặc tư liệu, hãy để ý thông tin chú thích tại chỗ; bản thuyết minh số chỉ dẫn mạch câu chuyện, không thay thế nội dung kiểm chứng của bảo tàng và di tích.

### Scene ND03 — `nguyen-du-statue` — Tượng Nguyễn Du

Role: major stop
Target: 28–36s

**VI narration draft**

> Trước tượng Nguyễn Du, hành trình chuyển từ không gian tư liệu sang một biểu tượng tưởng niệm. Hình ảnh nhà thơ hôm nay gắn với sức sống lâu dài của văn chương trong đời sống Việt Nam. Hãy dành vài giây quan sát góc đặt tượng và không gian xung quanh, rồi nghĩ về cách một tác phẩm có thể tiếp tục được đọc, diễn giải và truyền lại qua nhiều thế hệ.

### Scene ND04 — `nguyen-du-garden-path` — Lối vườn tưởng niệm

Role: connector
Target: 18–24s

**VI narration draft**

> Lối vườn là đoạn kết yên hơn của hành trình Nguyễn Du. Sau những thông tin về tác giả và di sản, đây là lúc để nhịp kể lùi lại. Bạn có thể tiếp tục khám phá tự do, mở transcript để đọc lại phần vừa nghe, hoặc trở về bản đồ Hà Tĩnh để chọn một điểm đến khác.

### Nguyễn Du source notes

- Cổng thông tin điện tử tỉnh Hà Tĩnh — thông tin Khu lưu niệm Nguyễn Du/điểm du lịch cấp tỉnh và cấu phần quần thể: `https://hatinh.gov.vn/vi/bai-viet/trang-trong-le-gio-lan-thu-204-cua-dai-thi-hao-nguyen-du`
- Bảo tàng Hà Tĩnh — di tích tiêu biểu vùng Tiên Điền: `https://baotang.hatinh.gov.vn/mot-so-di-tich-lich-su-van-hoa-tieu-bieu-vung-tien-dien-lai-thach-va-giai-phap-bao-ton-va-phat-tr-1757497794.html`

Final script must be approved by the heritage/content owner before recording.

---

# 7. Ngã ba Đồng Lộc

Destination slug: `nga-ba-dong-loc`

Source-grounded facts used in drafts: Ngã ba Đồng Lộc was a strategic transport point during the resistance war against the United States; official Hà Tĩnh sources describe the effort to keep the transport route open and commemorate the ten young female volunteers who died on 24 July 1968 while performing traffic-support duties.

## Ambient direction — Main

**Working title:** `Khoảng lặng Đồng Lộc`

Character:

- solemn, minimal and spacious;
- no combat sound effects;
- no bomb/explosion recreation;
- no heroic trailer percussion;
- soft sustained texture with long silence windows;
- narration clarity and respect take priority over musical identity.

Loop target: 3–5 minutes.

Recommended production narrative order, if compatible with the actual spatial graph:

```text
dong-loc-approach
→ dong-loc-memorial
→ dong-loc-monument
→ dong-loc-remembrance
```

If the spatial graph requires another order, scripts must remain individually understandable and the Auto Tour must follow valid scene navigation rather than forcing editorial order.

### Scene DL01 — `dong-loc-memorial` — Khu tưởng niệm Đồng Lộc

Role: major stop
Target: 35–45s

**VI narration draft**

> Ngã ba Đồng Lộc là một địa chỉ lịch sử đặc biệt của Hà Tĩnh. Trong những năm chiến tranh, nơi đây nằm trên tuyến giao thông quan trọng nối hậu phương với tiền tuyến và trở thành một trọng điểm đánh phá ác liệt. Nhưng câu chuyện Đồng Lộc không chỉ là câu chuyện của bom đạn. Đó còn là câu chuyện về những con người bám đường, giữ mạch giao thông và chấp nhận hiểm nguy để các đoàn xe tiếp tục đi qua.

### Scene DL02 — `dong-loc-monument` — Không gian tượng đài

Role: major stop
Target: 30–38s

**VI narration draft**

> Tại không gian tượng đài, hãy nhìn toàn cảnh trước khi tập trung vào từng chi tiết. Những hình khối tưởng niệm nhắc tới nhiều lực lượng đã cùng giữ tuyến đường: thanh niên xung phong, bộ đội, dân công và người dân địa phương. Phần kể ở đây cần giữ sự trang trọng — không tái hiện chiến tranh như một màn trình diễn, mà giúp người xem hiểu vì sao việc giữ một con đường thông suốt khi ấy có ý nghĩa sống còn.

### Scene DL03 — `dong-loc-remembrance` — Không gian tri ân

Role: major stop
Target: 35–45s

**VI narration draft**

> Một ký ức trung tâm của Đồng Lộc là sự hy sinh của mười nữ thanh niên xung phong vào ngày 24 tháng 7 năm 1968 khi đang làm nhiệm vụ bảo đảm giao thông. Các chị còn rất trẻ. Hôm nay, câu chuyện ấy được nhắc lại không để tạo cảm giác bi kịch bằng hiệu ứng, mà để giữ một khoảng tưởng niệm đúng nghĩa. Nếu đang dùng Auto Tour, hành trình nên dừng lâu hơn ở đây trước khi chuyển cảnh.

### Scene DL04 — `dong-loc-approach` — Lối vào khu tưởng niệm

Role: connector
Target: 18–24s

**VI narration draft**

> Trên lối vào Đồng Lộc, hãy chuẩn bị cho một trải nghiệm khác với các điểm du lịch cảnh quan. Đây là không gian tưởng niệm, vì vậy nhịp di chuyển, âm lượng và cách kể chuyện đều nên tiết chế. Từ đây, bạn có thể đi tiếp theo lộ trình lịch sử hoặc khám phá tự do từng điểm trong khu di tích.

### Đồng Lộc source notes

- Cổng thông tin điện tử tỉnh Hà Tĩnh — Đồng Lộc trong trái tim cả nước: `https://hatinh.gov.vn/vi/bai-viet/dong-loc-trong-trai-tim-ca-nuoc`
- Cổng thông tin xã Đồng Lộc — giới thiệu chung/Khu di tích: `https://dongloc.hatinh.gov.vn/tin-tuc/gioi-thieu-chung-ve-xa-ong-loc`
- Cổng thông tin Hà Tĩnh/Hương Khê — thông tin ngày 24/7/1968 và 10 nữ TNXP: `https://huongkhe.hatinh.gov.vn/vi/bai-viet/nga-ba-dong-loc---ban-hung-ca-bat-tu-cua-chu-nghia-anh-hung-cach-mang-viet-nam`

Final recording must be reviewed by the heritage/content owner. Do not add names, ages, casualty details, battle statistics, quotes, or reconstructed sounds unless separately source-checked and approved.

---

# 8. Content inventory

| ID | Scene | Target duration | VI script | Ambient |
| --- | --- | ---: | --- | --- |
| ST01 | Cổng Sơn Trang | 30–35s | Drafted | Sơn Trang main |
| ST02 | Lối vào Sơn Trang | 12–16s | Drafted | Sơn Trang main |
| ST03 | Sân trung tâm | 18–22s | Drafted | Sơn Trang main |
| ST04 | Không gian Văn hóa | 35–45s | Drafted | Sơn Trang main |
| ST05 | Lối sinh thái | 12–16s | Drafted | main → ecology optional |
| ST06 | Không gian Sinh thái | 30–40s | Drafted | ecology optional |
| ST07 | Lối tâm linh | 12–16s | Drafted | main → spiritual optional |
| ST08 | Không gian Tâm linh | 30–40s | Drafted | spiritual optional |
| TC01 | Lối dạo Thiên Cầm | 28–35s | Drafted | Thiên Cầm main |
| TC02 | Bờ biển Thiên Cầm | 28–35s | Drafted | Thiên Cầm main |
| TC03 | Điểm ngắm Thiên Cầm | 25–32s | Drafted | Thiên Cầm main |
| ND01 | Sân khu lưu niệm Nguyễn Du | 32–40s | Drafted | Nguyễn Du main |
| ND02 | Không gian nhà lưu niệm | 35–45s | Drafted | Nguyễn Du main |
| ND03 | Tượng Nguyễn Du | 28–36s | Drafted | Nguyễn Du main |
| ND04 | Lối vườn tưởng niệm | 18–24s | Drafted | Nguyễn Du main |
| DL01 | Khu tưởng niệm Đồng Lộc | 35–45s | Drafted | Đồng Lộc main |
| DL02 | Không gian tượng đài | 30–38s | Drafted | Đồng Lộc main |
| DL03 | Không gian tri ân | 35–45s | Drafted | Đồng Lộc main |
| DL04 | Lối vào khu tưởng niệm | 18–24s | Drafted | Đồng Lộc main |

## 9. Required production asset IDs

Recommended semantic naming convention for editorial/content import only; database IDs remain stable UUIDs:

```text
ambient:son-trang-co-dam:main:v1
ambient:son-trang-co-dam:ecology:v1       # optional
ambient:son-trang-co-dam:spiritual:v1     # optional
ambient:bien-thien-cam:main:v1
ambient:khu-luu-niem-nguyen-du:main:v1
ambient:nga-ba-dong-loc:main:v1

narration:son-trang-co-dam:son-trang-gate:vi:v1
...
narration:nga-ba-dong-loc:dong-loc-approach:vi:v1
```

Do not use these editorial strings as the only database identity. The normalized model owns canonical IDs and version/provenance fields.

## 10. Recording / pre-generation gate

For each narration before publication:

1. script fact/editorial approval;
2. final immutable script version;
3. voice identity selected and stored as `voiceId` when applicable;
4. pre-generated/recorded file produced;
5. loudness/noise/pronunciation QA;
6. transcript checked against audio;
7. timed caption segmentation added when available;
8. rights holder/reference captured;
9. `version` captured;
10. media asset processed to `ready`;
11. semantic track + scene assignment published.

## 11. Ambient production gate

For each main ambient track:

1. destination creative brief approved;
2. source composition/field recording provenance documented;
3. seamless-loop QA;
4. headphone and mobile-speaker QA;
5. narration ducking tested;
6. no prominent melody collision with speech;
7. rights/reference/version recorded;
8. media asset processed to `ready`;
9. destination ambient assignment published.

## 12. Definition of content readiness

The first content baseline is `CONTENT READY` only when all four destinations can resolve their approved main ambient track and every one of the current 19 scenes has an approved VI narration/transcript assignment or an explicitly approved exception.

Optional EN and optional Sơn Trang ambient overrides do not block the first baseline.

Until then the correct status is:

```text
ENGINEERING READY: may be true independently.
CONTENT READY: BLOCKED / PARTIAL.
```
