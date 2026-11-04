// Kho từ cho trò ĐOÁN CHỮ giờ ra chơi: [từ hoặc cụm từ, gợi ý chủ đề]. Từ đời thường, hợp trẻ em, đáp án rõ ràng (gợi ý đủ cụ thể để chỉ có một đáp án).
// Người xem gõ có dấu hay không dấu đều được (so sánh sau khi bỏ dấu và khoảng trắng).
const HANG = [
  // con vật
  ['con voi', 'Con vật có vòi dài'], ['con hổ', 'Chúa sơn lâm'], ['con thỏ', 'Con vật tai dài, thích ăn cà rốt'], ['con mèo', 'Hay bắt chuột'],
  ['con chó', 'Người bạn trung thành, hay sủa'], ['con gà', 'Gáy ò ó o mỗi sáng'], ['con vịt', 'Biết bơi, kêu cạp cạp'], ['con trâu', 'Bạn của người nông dân trên đồng'],
  ['con ngựa', 'Chạy nhanh, có bờm dài'], ['con khỉ', 'Hay leo cây, thích ăn chuối'], ['hươu cao cổ', 'Con vật cao nhất thế giới'], ['con rùa', 'Chậm chạp, mang mai trên lưng'],
  ['con ong', 'Làm ra mật ngọt'], ['con bướm', 'Cánh nhiều màu, bay lượn quanh hoa'], ['con cá', 'Sống dưới nước, thở bằng mang'], ['cá heo', 'Thông minh, sống ở biển, nhảy múa trên sóng'],
  ['con cua', 'Đi ngang, có hai càng'], ['con ếch', 'Kêu ộp oạp sau cơn mưa'], ['con dơi', 'Loài thú biết bay, ngủ treo ngược'], ['con nhím', 'Mình đầy gai nhọn'],
  ['đà điểu', 'Chim lớn nhất, không biết bay'], ['gấu trúc', 'Đen trắng, thích ăn măng tre'], ['con sóc', 'Đuôi xù, hay ăn hạt trên cây'], ['con cáo', 'Khôn ngoan trong truyện cổ tích'],
  ['con bò', 'Cho sữa, kêu ò ó'], ['con dê', 'Có râu, kêu be be'], ['con heo', 'Béo tròn, kêu ụt ịt'], ['chim sẻ', 'Chim nhỏ quen thuộc ở sân nhà'],
  ['con kiến', 'Nhỏ xíu nhưng rất chăm chỉ'], ['cá voi', 'Con vật lớn nhất đại dương'],
  // trái cây, rau củ
  ['quả cam', 'Trái cây màu cam, nhiều vitamin C'], ['quả chuối', 'Trái cây vàng, khỉ rất thích'], ['quả táo', 'Quả tròn, đỏ hoặc xanh, giòn ngọt'], ['quả xoài', 'Trái cây vàng, ăn với muối ớt rất ngon'],
  ['quả dứa', 'Quả có mắt và gai, vị chua ngọt'], ['dưa hấu', 'Vỏ xanh, ruột đỏ, mùa hè ăn mát'], ['quả nho', 'Quả mọc thành chùm, làm nho khô'], 
  ['quả ổi', 'Quả xanh, ruột trắng hoặc hồng, ăn giòn'], ['quả mít', 'Vỏ gai, múi vàng thơm'], ['quả lê', 'Quả hình giọt nước, ruột mọng nước'], ['quả chanh', 'Quả chua, dùng pha nước giải khát'],
  ['quả đu đủ', 'Ruột màu cam, nhiều hạt đen'], ['sầu riêng', 'Vua của các loại trái cây'], ['măng cụt', 'Nữ hoàng trái cây, ruột trắng'], ['cà rốt', 'Củ màu cam, thỏ rất thích'],
  ['cà chua', 'Quả đỏ mọng, dùng nấu canh'], ['dưa leo', 'Quả xanh dài, ăn sống giòn mát'], ['khoai tây', 'Củ vàng, chiên giòn rất ngon'], ['bắp cải', 'Rau cuộn tròn nhiều lớp'],
  ['rau muống', 'Rau xanh luộc ăn với nước chấm'], ['củ hành', 'Cắt ra làm cay mắt'], ['quả bí', 'Quả to màu cam dịp Trung thu'],
  // đồ vật
  ['quyển vở', 'Học sinh viết bài vào đây'], ['cái bút', 'Dùng để viết'], ['cái thước', 'Dùng để kẻ đường thẳng'], ['cục tẩy', 'Xóa nét chì viết sai'],
  ['cặp sách', 'Đeo trên lưng đi học'], ['bảng đen', 'Cô giáo viết phấn lên đây'], ['viên phấn', 'Màu trắng, viết lên bảng'], ['cái bàn', 'Bốn chân, đặt sách vở lên trên'],
  ['cái ghế', 'Để ngồi, có chân và lưng tựa'], ['cái đèn', 'Thắp sáng khi trời tối'], ['cái quạt', 'Làm mát ngày nóng'], ['đồng hồ', 'Cho ta biết mấy giờ'],
  ['cái gương', 'Soi vào thấy mặt mình'], ['cái kéo', 'Dùng để cắt giấy'], ['cái nón', 'Đội trên đầu che nắng'], ['chiếc ô', 'Che mưa che nắng'],
  ['cái cốc', 'Dùng để uống nước'], ['cái bát', 'Đựng cơm'], ['đôi đũa', 'Cặp que dùng để gắp thức ăn'], ['cái thìa', 'Dùng để múc canh'],
  ['quả bóng', 'Tròn, dùng để đá hoặc ném'], ['con diều', 'Bay cao trên bầu trời nhờ gió'], ['cái xô', 'Đựng nước, có quai xách'], ['chìa khóa', 'Dùng để mở cửa'],
  ['quyển sách', 'Chứa nhiều trang chữ và tranh'], ['hộp bút', 'Đựng bút, thước trong cặp'], ['bút chì', 'Viết được rồi tẩy xóa dễ dàng'], ['cái tủ', 'Đựng quần áo trong nhà'],
  // nghề nghiệp
  ['cô giáo', 'Người dạy học'], ['bác sĩ', 'Khám bệnh cho mọi người'], ['nông dân', 'Làm ruộng trồng lúa'], ['công an', 'Giữ gìn trật tự đường phố'],
  ['thợ may', 'Làm ra quần áo'], ['đầu bếp', 'Nấu những món ăn ngon'], ['phi công', 'Lái máy bay'], ['ca sĩ', 'Người hát trên sân khấu'],
  ['họa sĩ', 'Vẽ nên những bức tranh'], ['tài xế', 'Lái xe chở khách'], ['lính cứu hỏa', 'Dập tắt đám cháy'], ['thợ xây', 'Xây nhà cao tầng'],
  ['nhà báo', 'Viết tin tức cho mọi người đọc'], ['cầu thủ', 'Chơi đá bóng trên sân cỏ'],
  // thiên nhiên
  ['mặt trời', 'Chiếu sáng ban ngày'], ['mặt trăng', 'Tỏa sáng ban đêm, lúc tròn lúc khuyết'], ['ngôi sao', 'Lấp lánh trên bầu trời đêm'], ['cầu vồng', 'Bảy sắc sau cơn mưa'],
  ['đám mây', 'Trắng bồng bềnh trên trời'], ['cơn mưa', 'Nước rơi từ trên trời xuống'], ['dòng sông', 'Nước chảy ra biển'], ['ngọn núi', 'Cao hơn đồi, có đỉnh nhọn'],
  ['bãi biển', 'Nơi có cát và sóng'], ['cánh đồng', 'Nơi trồng lúa rộng lớn'], ['khu rừng', 'Nhiều cây cối, nhiều muông thú'], ['con suối', 'Dòng nước nhỏ chảy giữa núi rừng'],
  ['bông hoa', 'Đẹp và thơm, ong bướm hay đến'], ['hoa sen', 'Mọc dưới ao, hương thơm dịu'], ['hoa hướng dương', 'Luôn quay về phía mặt trời'], ['cây tre', 'Thân rỗng, mọc thành bụi ở làng quê'],
  // địa danh Việt Nam
  ['hà nội', 'Thủ đô của Việt Nam'], ['đà nẵng', 'Thành phố có cầu Rồng bên sông Hàn'], ['vịnh hạ long', 'Di sản thiên nhiên với nghìn đảo đá vôi'], ['hồ gươm', 'Hồ giữa lòng Hà Nội có Tháp Rùa'],
  ['đà lạt', 'Thành phố ngàn hoa, khí hậu mát mẻ'], ['cần thơ', 'Thành phố miền Tây có chợ nổi Cái Răng'], ['phú quốc', 'Hòn đảo lớn nhất Việt Nam'], ['hội an', 'Phố cổ đèn lồng'],
  ['nha trang', 'Thành phố biển nổi tiếng ở Khánh Hòa'], ['sa pa', 'Thị trấn có ruộng bậc thang trên núi'], ['sông hồng', 'Con sông chảy qua Hà Nội'], ['cố đô huế', 'Kinh thành xưa bên sông Hương'],
  // món ăn
  ['bánh chưng', 'Món bánh vuông ngày Tết'], ['bánh mì', 'Ổ bánh kẹp nhân, món ăn sáng quen thuộc'], ['phở bò', 'Món nước nổi tiếng của Hà Nội'], ['bún chả', 'Món bún ăn với thịt nướng ở Hà Nội'],
  ['bánh xèo', 'Bánh giòn vàng, ăn kèm rau sống'], ['cơm tấm', 'Món cơm làm từ gạo vỡ, nổi tiếng ở Sài Gòn'], ['xôi gấc', 'Món xôi màu đỏ cam'], ['chè đậu xanh', 'Món ngọt ăn mát ngày hè'],
  ['kem', 'Món lạnh ngọt, ăn ngày nóng'], ['bánh bao', 'Bánh trắng hấp có nhân bên trong'], ['canh chua', 'Món canh vị chua ngọt miền Nam'], ['nem rán', 'Món chiên cuốn bằng bánh tráng'],
  ['trứng rán', 'Món ăn đơn giản làm từ trứng gà'], ['sữa chua', 'Món chua ngọt làm từ sữa'], ['bánh trung thu', 'Món bánh ăn dưới ánh trăng rằm'], ['rau câu', 'Món tráng miệng mát lạnh, đông lại thành khối'],
  // phương tiện
  ['xe đạp', 'Hai bánh, đạp bằng chân'], ['xe máy', 'Hai bánh, chạy bằng động cơ'], ['máy bay', 'Bay trên bầu trời'], ['tàu hỏa', 'Chạy trên đường ray'],
  ['xe buýt', 'Chở nhiều hành khách trong thành phố'], ['con thuyền', 'Đi trên mặt nước'], ['xe cứu hỏa', 'Màu đỏ, chạy đến nơi có đám cháy'], ['tàu thủy', 'Chở hàng hóa và người đi trên biển'],
  ['khinh khí cầu', 'Bay lên trời nhờ quả cầu khổng lồ'], ['xe lăn', 'Giúp người đi lại khó khăn di chuyển'],
  // thể thao, trò chơi
  ['bóng đá', 'Hai đội đá vào khung thành'], ['cầu lông', 'Đánh quả cầu qua lưới bằng vợt'], ['bơi lội', 'Môn thể thao dưới nước'], ['nhảy dây', 'Trò chơi vung dây và nhảy qua'],
  ['bóng rổ', 'Ném bóng vào rổ trên cao'], ['cờ vua', 'Trò chơi trên bàn có vua và hậu'], ['bịt mắt bắt dê', 'Trò chơi dân gian bịt mắt đi tìm bạn'], ['kéo co', 'Hai đội kéo một sợi dây thừng'],
  ['đá cầu', 'Trò chơi dùng chân tâng quả cầu lông vũ'], ['chạy bộ', 'Môn thể thao chạy nhanh dài hơi'],
  // cơ thể, đời sống
  ['bàn tay', 'Có năm ngón, dùng để cầm nắm'], ['đôi mắt', 'Giúp ta nhìn thấy mọi vật'], ['chiếc mũi', 'Dùng để ngửi mùi'], ['hàm răng', 'Dùng để nhai thức ăn'],
  ['ngôi nhà', 'Nơi cả gia đình sống chung'], ['trường học', 'Nơi học sinh đến học mỗi ngày'], ['vườn hoa', 'Nơi có nhiều bông hoa đủ màu'], ['sân trường', 'Nơi học sinh vui chơi giờ ra chơi'],
  ['thư viện', 'Nơi có thật nhiều sách để đọc'], ['công viên', 'Nơi có cây xanh, ghế đá và trẻ em vui chơi'], ['bệnh viện', 'Nơi bác sĩ khám bệnh'], ['sinh nhật', 'Ngày kỷ niệm mỗi năm có bánh và nến'],
  ['trung thu', 'Ngày Tết thiếu nhi có đèn lồng và bánh nướng'], ['ngày tết', 'Dịp lễ lớn nhất, có bánh chưng và lì xì'],
];
module.exports = { HANG };
