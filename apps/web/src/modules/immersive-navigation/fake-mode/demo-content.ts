import type { ImmersiveAudioTrack, ImmersiveTranscriptContent } from '../../../shared/contracts';

/**
 * Content for the explicit local demo lane. This is not a production content
 * source: production rights/publication gates and file-backed audio remain
 * separate.
 */
export interface DemoSceneContent {
  storyTitle: string;
  storyContent: string;
  transcript: ImmersiveTranscriptContent;
}

export const PHASE_1D_CANONICAL_SCENE_IDS = {
  'bien-thien-cam': ['thien-cam-boardwalk', 'thien-cam-shore', 'thien-cam-lookout'],
  'khu-luu-niem-nguyen-du': [
    'nguyen-du-courtyard',
    'nguyen-du-memorial-house',
    'nguyen-du-statue',
    'nguyen-du-garden-path',
  ],
  'nga-ba-dong-loc': [
    'dong-loc-memorial',
    'dong-loc-monument',
    'dong-loc-remembrance',
    'dong-loc-approach',
  ],
  'son-trang-co-dam': [
    'son-trang-gate',
    'son-trang-entrance-path',
    'son-trang-courtyard',
    'son-trang-culture',
    'son-trang-ecology-path',
    'son-trang-ecology',
    'son-trang-spiritual-path',
    'son-trang-spiritual',
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

function createSceneContent(
  destinationSlug: string,
  sceneId: string,
  title: string,
  storyContent: string,
  narration: string,
): DemoSceneContent {
  return {
    storyTitle: title,
    storyContent,
    transcript: {
      id: `transcript:${destinationSlug}:${sceneId}:vi`,
      locale: 'vi',
      title,
      timingMode: 'plain',
      segments: [
        {
          id: `${sceneId}:vi:1`,
          startMs: null,
          endMs: null,
          text: narration,
        },
      ],
    },
  };
}

const PHASE_1D_CONTENT: Readonly<Record<string, Readonly<Record<string, DemoSceneContent>>>> = {
  'bien-thien-cam': {
    'thien-cam-boardwalk': createSceneContent(
      'bien-thien-cam',
      'thien-cam-boardwalk',
      'Điểm bắt đầu ven biển',
      'Điểm mở đầu dẫn người xem từ khu vực tiếp cận vào không gian biển Thiên Cầm.',
      'Hành trình bắt đầu tại khu vực tiếp cận ven biển Thiên Cầm. Đây là một trong những điểm du lịch biển nổi bật của Hà Tĩnh, với dải bờ biển uốn cong và không gian mở hướng ra biển. Từ đây, hãy tiến về phía bãi biển để tiếp tục khám phá cảnh quan đặc trưng của Thiên Cầm.',
    ),
    'thien-cam-shore': createSceneContent(
      'bien-thien-cam',
      'thien-cam-shore',
      'Bãi biển Thiên Cầm',
      'Bãi biển là lớp trải nghiệm trung tâm của tour, nhấn vào đường bờ cong, cát và không gian biển.',
      'Trước mắt là bãi biển Thiên Cầm. Các nguồn của Hà Tĩnh mô tả nơi đây với bãi cát sáng, nước biển trong và đường bờ uốn cong mềm mại. Thiên Cầm nằm giữa núi Thiên Cầm và núi Đầu Voi, tạo nên một không gian biển có dáng cánh cung đặc trưng.',
    ),
    'thien-cam-lookout': createSceneContent(
      'bien-thien-cam',
      'thien-cam-lookout',
      'Điểm ngắm Thiên Cầm',
      'Điểm kết vòng tham quan, mở góc nhìn rộng hơn về không gian biển và địa hình ven biển.',
      'Từ điểm ngắm cảnh, hành trình mở ra góc nhìn rộng hơn về dải bờ biển Thiên Cầm. Khu vực này còn gắn với đời sống làng biển Cẩm Nhượng và các điểm văn hóa như chùa Cầm Sơn. Đây là điểm phù hợp để kết thúc vòng tham quan trước khi quay lại bãi biển hoặc điểm bắt đầu.',
    ),
  },
  'khu-luu-niem-nguyen-du': {
    'nguyen-du-courtyard': createSceneContent(
      'khu-luu-niem-nguyen-du',
      'nguyen-du-courtyard',
      'Không gian đón vào Khu lưu niệm',
      'Giới thiệu tổng quan quy mô và cấu trúc của Khu di tích Nguyễn Du.',
      'Khu lưu niệm Nguyễn Du tại Tiên Điền hiện có diện tích hơn hai mươi tám nghìn năm trăm mét vuông. Không gian được tổ chức thành khu tưởng niệm và khu trưng bày, giúp du khách tiếp cận cả dấu ấn tưởng niệm lẫn hệ thống tư liệu về cuộc đời và sự nghiệp của Đại thi hào Nguyễn Du.',
    ),
    'nguyen-du-memorial-house': createSceneContent(
      'khu-luu-niem-nguyen-du',
      'nguyen-du-memorial-house',
      'Không gian tưởng niệm Nguyễn Du',
      'Lớp nội dung về khu tưởng niệm gồm nhà thờ, bia, tượng và cảnh quan sân vườn.',
      'Khu tưởng niệm là phần cốt lõi của quần thể, với nhà thờ, tượng đài, bia và cảnh quan sân vườn. Khu lưu niệm Nguyễn Du được công nhận là Di tích quốc gia đặc biệt năm 2012, ghi nhận giá trị nổi bật của di sản gắn với tác giả Truyện Kiều.',
    ),
    'nguyen-du-statue': createSceneContent(
      'khu-luu-niem-nguyen-du',
      'nguyen-du-statue',
      'Nguyễn Du và giá trị văn hóa',
      'Điểm kể chuyện về tầm vóc văn học và sự ghi nhận quốc tế đối với Nguyễn Du.',
      'Nguyễn Du, tác giả Truyện Kiều, là một trong những danh nhân tiêu biểu của văn hóa Việt Nam. Năm 2013, UNESCO vinh danh Nguyễn Du trong khuôn khổ kỷ niệm hai trăm năm mươi năm ngày sinh vào năm 2015, góp phần khẳng định sức lan tỏa quốc tế của di sản Nguyễn Du.',
    ),
    'nguyen-du-garden-path': createSceneContent(
      'khu-luu-niem-nguyen-du',
      'nguyen-du-garden-path',
      'Hành trình qua không gian di sản',
      'Điểm chuyển tiếp giữa cảnh quan sân vườn và lớp nội dung trưng bày.',
      'Bên cạnh khu tưởng niệm, khu trưng bày lưu giữ hơn hai nghìn hiện vật, tư liệu và hình ảnh về Nguyễn Du cùng dòng họ Nguyễn Tiên Điền. Lối trải nghiệm qua cảnh quan sân vườn có thể được dùng như nhịp chuyển nhẹ trước khi người xem tiếp tục tìm hiểu các lớp tư liệu của khu di tích.',
    ),
  },
  'nga-ba-dong-loc': {
    'dong-loc-memorial': createSceneContent(
      'nga-ba-dong-loc',
      'dong-loc-memorial',
      'Không gian tưởng niệm Đồng Lộc',
      'Điểm nhập môn cho hành trình tri ân tại Khu di tích Ngã ba Đồng Lộc.',
      'Ngã ba Đồng Lộc là địa danh lịch sử đặc biệt trên tuyến Quốc lộ 15A. Hôm nay, khu di tích là không gian tưởng niệm và giáo dục truyền thống, nơi du khách tìm hiểu về những con người đã làm nhiệm vụ bảo đảm giao thông trong những năm chiến tranh ác liệt.',
    ),
    'dong-loc-monument': createSceneContent(
      'nga-ba-dong-loc',
      'dong-loc-monument',
      'Biểu tượng tri ân',
      'Kể về hệ thống công trình tưởng niệm, tránh gán sai scene chưa có media thật vào một công trình cụ thể.',
      'Trong Khu di tích Ngã ba Đồng Lộc có nhiều công trình tưởng niệm dành cho các lực lượng và những người đã hy sinh. Với scene demo này, nội dung được giữ ở mức khái quát cho đến khi panorama thật được xác nhận đúng công trình, hướng nhìn và vị trí.',
    ),
    'dong-loc-remembrance': createSceneContent(
      'nga-ba-dong-loc',
      'dong-loc-remembrance',
      'Tưởng nhớ lực lượng Thanh niên xung phong',
      'Lớp nội dung trọng tâm về Nhà bia TNXP và 10 nữ liệt sĩ.',
      'Nhà bia tưởng niệm liệt sĩ Thanh niên xung phong toàn quốc tại Đồng Lộc ghi danh hơn bốn nghìn liệt sĩ. Khu mộ 10 nữ anh hùng liệt sĩ Thanh niên xung phong là một trong những điểm tri ân đặc biệt, nhắc nhớ sự hy sinh của tuổi trẻ trên tuyến lửa Đồng Lộc.',
    ),
    'dong-loc-approach': createSceneContent(
      'nga-ba-dong-loc',
      'dong-loc-approach',
      'Con đường đến Đồng Lộc',
      'Đặt bối cảnh vai trò giao thông của Ngã ba Đồng Lộc trước khi vào không gian tưởng niệm.',
      'Ngã ba Đồng Lộc nằm trên Quốc lộ 15A và từng giữ vai trò quan trọng trong mạng lưới giao thông thời chiến. Trong giai đoạn ác liệt của năm 1968, khu vực phải hứng chịu cường độ đánh phá rất lớn. Hành trình vào khu di tích vì thế cũng là hành trình đi từ một nút giao thông lịch sử đến không gian tưởng niệm hôm nay.',
    ),
  },
  'son-trang-co-dam': {
    'son-trang-gate': createSceneContent(
      'son-trang-co-dam',
      'son-trang-gate',
      'Cổ Đạm – mở đầu hành trình',
      'Mở đầu bằng bối cảnh văn hóa Cổ Đạm; không khẳng định cổng hay công trình cụ thể của Sơn Trang.',
      'Cổ Đạm là vùng đất giàu truyền thống văn hóa của Nghi Xuân, Hà Tĩnh. Các nguồn địa phương ghi nhận hệ thống đình, đền, tín ngưỡng, nghệ thuật ca trù và nghề gốm cổ truyền như những lớp bản sắc đáng chú ý. Hành trình demo bắt đầu từ bối cảnh văn hóa chung đó.',
    ),
    'son-trang-entrance-path': createSceneContent(
      'son-trang-co-dam',
      'son-trang-entrance-path',
      'Lối vào câu chuyện Cổ Đạm',
      'Scene chuyển tiếp, chỉ kể bối cảnh làng quê và văn hóa địa phương.',
      'Khi đi sâu hơn vào hành trình, nội dung tập trung vào mối liên hệ giữa đời sống làng quê, ký ức cộng đồng và những thực hành văn hóa được gìn giữ tại Cổ Đạm. Vị trí vật lý cụ thể của scene sẽ chỉ được chốt khi có ảnh, sơ đồ hoặc xác nhận từ chủ điểm đến.',
    ),
    'son-trang-courtyard': createSceneContent(
      'son-trang-co-dam',
      'son-trang-courtyard',
      'Không gian cộng đồng',
      'Giữ nội dung ở mức bối cảnh cộng đồng, không coi tên scene là bằng chứng về sân/courtyard thật.',
      'Cổ Đạm được giới thiệu trong tư liệu địa phương như một vùng đất có lịch sử, văn hóa dòng họ, đình, đền và tín ngưỡng phong phú. Scene này dùng lớp nội dung cộng đồng làm cầu nối, nhưng không được coi tên courtyard là bằng chứng về một sân cụ thể ngoài thực địa.',
    ),
    'son-trang-culture': createSceneContent(
      'son-trang-co-dam',
      'son-trang-culture',
      'Ca trù Cổ Đạm',
      'Lớp nội dung văn hóa có bằng chứng mạnh nhất của Cổ Đạm.',
      'Ca trù là một lớp di sản nổi bật của Cổ Đạm. Bảo tàng Hà Tĩnh ghi nhận ca trù được UNESCO đưa vào danh sách di sản văn hóa phi vật thể cần bảo vệ khẩn cấp năm 2009 và xác nhận tại Hà Tĩnh có ca trù Cổ Đạm. Đây là nội dung văn hóa phù hợp nhất để làm điểm nhấn cho scene này.',
    ),
    'son-trang-ecology-path': createSceneContent(
      'son-trang-co-dam',
      'son-trang-ecology-path',
      'Nhịp chuyển qua cảnh quan Cổ Đạm',
      'Không gắn một cảnh quan cụ thể với Sơn Trang khi chưa có media thật.',
      'Cổ Đạm không chỉ có lớp di sản văn hóa mà còn gắn với hoạt động sản xuất và cảnh quan làng quê. Nội dung scene này được giữ như một nhịp chuyển về môi trường sống địa phương; mọi mô tả vật thể nhìn thấy phải chờ panorama thật để đối chiếu.',
    ),
    'son-trang-ecology': createSceneContent(
      'son-trang-co-dam',
      'son-trang-ecology',
      'Sắc xuân Xuân Sơn',
      'Dùng câu chuyện đào phai Xuân Sơn như ví dụ kinh tế-cảnh quan đã xác minh, không nói vườn đào nằm trong Sơn Trang.',
      'Một nét cảnh quan và sinh kế đáng chú ý ở Cổ Đạm là đào phai Xuân Sơn. Năm 2024, sản phẩm này được đánh giá OCOP 3 sao và trở thành sản phẩm cây cảnh OCOP đầu tiên của huyện Nghi Xuân. Đây là câu chuyện địa phương có thể dùng cho lớp sinh thái, nhưng không được gắn vị trí vườn đào vào scene nếu chưa xác minh.',
    ),
    'son-trang-spiritual-path': createSceneContent(
      'son-trang-co-dam',
      'son-trang-spiritual-path',
      'Dấu nối tín ngưỡng',
      'Giới thiệu truyền thống đình, đền và tín ngưỡng Cổ Đạm ở mức tổng quan.',
      'Tư liệu chính thức của xã Cổ Đạm ghi nhận hệ thống đình, đền và tín ngưỡng là một phần quan trọng trong lịch sử văn hóa địa phương. Scene chuyển tiếp này có thể dẫn người xem đến lớp nội dung tâm linh, nhưng tên và vị trí công trình cụ thể phải được chủ điểm đến xác nhận.',
    ),
    'son-trang-spiritual': createSceneContent(
      'son-trang-co-dam',
      'son-trang-spiritual',
      'Đền Xứ và ký ức Ca trù',
      'Tham chiếu một địa điểm văn hóa được nguồn Hà Tĩnh nêu rõ, nhưng không tuyên bố scene chính là Đền Xứ.',
      'Một tham chiếu quan trọng trong không gian văn hóa Cổ Đạm là Đền Xứ, nơi được nguồn của Hà Tĩnh nhắc đến gắn với việc thờ Tổ nghề Ca trù. Nội dung này giúp nối lớp tín ngưỡng với di sản ca trù, nhưng scene chỉ được đặt tên theo công trình thật khi việc mapping thực địa hoàn tất.',
    ),
  },
};

export function getDemoSceneContent(
  destinationSlug: string,
  sceneId: string,
): DemoSceneContent | null {
  return PHASE_1D_CONTENT[destinationSlug]?.[sceneId] ?? null;
}

function createDemoNarrationTrack(
  destinationSlug: string,
  sceneId: string,
  content: DemoSceneContent,
): ImmersiveAudioTrack {
  return {
    id: `narration:${destinationSlug}:${sceneId}:vi`,
    type: 'narration',
    label: content.transcript.segments.map((segment) => segment.text).join(' '),
    src: null,
    rights: 'demo-only',
    locale: 'vi',
    readiness: 'ready',
    version: 'phase-1d-approved-demo-copy-2026-08',
    voiceId: 'demo-speech-vi',
  };
}

export function createDemoThienCamAudioTracks(): readonly ImmersiveAudioTrack[] {
  return createDemoAudioTracksForDestination(
    'bien-thien-cam',
    PHASE_1D_CANONICAL_SCENE_IDS['bien-thien-cam'],
  );
}

export function createDemoAmbientTrack(destinationSlug: string): ImmersiveAudioTrack {
  const source = PHASE_1D_AMBIENT_SOURCES[destinationSlug];

  return {
    id: `ambient:${destinationSlug}`,
    type: 'ambient',
    label: `Âm thanh không gian ${destinationSlug}`,
    src: source?.src ?? null,
    rights: 'demo-only',
    readiness: source ? 'ready' : 'unavailable',
    version: source ? 'phase-1d-mixkit-preview-2026-08-20' : 'phase-1d-ambient-candidate-2026-08',
  };
}

const PHASE_1D_AMBIENT_SOURCES: Readonly<Record<string, { readonly src: string }>> = {
  'bien-thien-cam': {
    src: '/demo/audio/phase-1d/bien-thien-cam-sea-waves.mp3',
  },
  'khu-luu-niem-nguyen-du': {
    src: '/demo/audio/phase-1d/nguyen-du-garden-ambience.mp3',
  },
  'nga-ba-dong-loc': {
    src: '/demo/audio/phase-1d/dong-loc-wind-ambience.mp3',
  },
  'son-trang-co-dam': {
    src: '/demo/audio/phase-1d/son-trang-forest-birds.mp3',
  },
};

export function createDemoAudioTracksForDestination(
  destinationSlug: string,
  sceneIds: readonly string[],
): readonly ImmersiveAudioTrack[] {
  return [
    createDemoAmbientTrack(destinationSlug),
    ...sceneIds.flatMap((sceneId) => {
      const content = getDemoSceneContent(destinationSlug, sceneId);
      return content ? [createDemoNarrationTrack(destinationSlug, sceneId, content)] : [];
    }),
  ];
}

export function createDemoNarrationTrackForScene(
  destinationSlug: string,
  sceneId: string,
): ImmersiveAudioTrack | null {
  const content = getDemoSceneContent(destinationSlug, sceneId);
  return content ? createDemoNarrationTrack(destinationSlug, sceneId, content) : null;
}

export const THIEN_CAM_DEMO_SCENE_IDS = Object.freeze([
  ...PHASE_1D_CANONICAL_SCENE_IDS['bien-thien-cam'],
]);
