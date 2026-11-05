// Mẹo học nhanh cô nói khi lớp lặng (≤ 15 từ/câu), theo khối: 1 = lớp 1–2, 2 = lớp 3–5, 3 = lớp 6–9.
// Không nhắc tiền / quà, không hứa hẹn kết quả; chỉ là thói quen học tốt.
const TIPS = {
  1: [
    'Đọc to từng chữ, ngón tay chỉ theo, em sẽ nhớ lâu hơn.',
    'Cộng nhẩm: tách số thành chục và đơn vị cho dễ.',
    'Viết chữ chậm một chút, nét sẽ đẹp và đều hơn.',
    'Học xong một bài, em kể lại cho người thân nghe nhé.',
    'Ngồi thẳng lưng, mắt cách vở một gang tay nhé.',
    'Mỗi ngày em thử học thuộc một bài thơ ngắn nhé.',
    'Gặp từ khó, em tách thành từng vần để đọc.',
    'Nghỉ mắt một chút: nhìn ra xa rồi chớp mắt vài lần.',
    'Đếm trên ngón tay cũng là cách học toán rất hay.',
    'Em chép từ mới ba lần để nhớ mặt chữ nhé.',
    'Học lâu thì vươn vai và uống nước một chút nhé.',
    'Thuộc bảng cộng trước, bảng trừ sẽ dễ hơn nhiều.',
    'Đọc xong câu hỏi, em đọc lại một lần nữa nhé.',
    'Hôm nay em thử vẽ lại điều em vừa học nhé.',
  ],
  2: [
    'Học bảng cửu chương: thuộc bảng 2, 5, 10 trước, bảng khó để sau.',
    'Nhân với 9: nhân với 10 rồi trừ đi chính số đó.',
    'Gạch chân từ khóa trong đề bài trước khi làm.',
    'Đọc đoạn văn hai lần: lần một hiểu ý, lần hai tìm chi tiết.',
    'Viết nháp trước, rồi mới chép sạch vào vở.',
    'Học từ tiếng Anh mới bằng cách đặt một câu ngắn.',
    'Tính xong, thử làm phép tính ngược để kiểm tra lại.',
    'Gặp từ khó viết, em tra từ điển rồi ghi nhớ.',
    'Học 25 phút thì nghỉ 5 phút cho đầu óc thư giãn.',
    'Bài toán có lời văn thì vẽ sơ đồ nhỏ ra giấy.',
    'Học nhóm với bạn: mỗi người giảng một phần cho nhau nghe.',
    'Ôn bài trước giờ ngủ, sáng mai em nhớ dễ hơn.',
    'Làm sai bài nào, em ghi riêng vào sổ lỗi sai để ôn.',
    'Đọc sách mười trang mỗi ngày, vốn từ sẽ tăng dần.',
  ],
  3: [
    'Làm đề: đọc lướt cả đề, câu dễ làm trước, câu khó để sau.',
    'Học công thức bằng cách tự suy ra, đừng chỉ học thuộc.',
    'Giải toán xong, em thay đáp án vào đề để kiểm tra.',
    'Ghi chép bằng sơ đồ tư duy giúp nhớ bài lâu hơn.',
    'Học từ tiếng Anh theo cụm, đừng học từng từ riêng lẻ.',
    'Văn nghị luận: mở bài rõ ý, thân bài có dẫn chứng.',
    'Giải thích bài cho bạn nghe là cách ôn rất hiệu quả.',
    'Ôn cách quãng: hôm sau, ba ngày sau, rồi một tuần sau.',
    'Đọc kỹ đề: gạch chân đơn vị và điều kiện của bài toán.',
    'Tắt thông báo khi học để tập trung hơn.',
    'Học lý và hóa, nhớ viết rõ đơn vị của mỗi đại lượng.',
    'Làm trắc nghiệm: loại trước những phương án chắc chắn sai.',
    'Nghe tiếng Anh mỗi ngày mười phút, tai sẽ quen dần.',
    'Đặt mục tiêu nhỏ mỗi ngày và hoàn thành từng bước.',
  ],
};
// Câu rủ bạn bè (dải chữ trên màn hình + 1 phần giọng lấp chỗ trống): không quà / điểm / link / hứa lợi ích.
const SHARE = [
  'Rủ bạn bè vào lớp học cùng cho vui nhé!',
  'Chia sẻ lớp học để cả nhóm cùng đố vui nhé!',
  'Có bạn thân thì rủ vào học chung với em nhé!',
  'Đố vui cùng nhau sẽ vui hơn, rủ thêm bạn nhé!',
  'Chia sẻ lớp học cho bạn cùng lớp của em nhé!',
  'Lớp đông thì học vui hơn, em rủ thêm bạn nhé!',
];
// Khi lớp chưa đủ đông (< lopHoc.shareTarget, mặc định 100 bạn): dải chữ có câu mục tiêu vui. {n} = số bạn hiện có, {t} = mục tiêu, {need} = còn thiếu.
// Cùng luật: không quà / điểm / xu / link / SĐT, không hứa lợi ích.
const GOAL = [
  'Cả lớp cùng rủ bạn cho đủ {t} bạn nhé! (hiện {n} bạn)',
  'Lớp mình đang có {n} bạn, rủ thêm cho đủ {t} nhé!',
  'Còn {need} chỗ nữa là đủ {t} bạn, cả lớp rủ bạn nhé!',
  'Cùng rủ bạn vào lớp cho đủ {t} bạn nào! (hiện {n} bạn)',
];
// Giọng cô (chỉ trong vòng lấp chỗ trống, tối đa 1 lần / 3 phút khi lớp chưa đủ đông); không đọc số.
const GOAL_VOICE = ['Cả lớp cùng rủ bạn bè vào cho thật đông vui nhé!', 'Mình rủ thêm bạn vào lớp cho đủ một trăm bạn nhé!', 'Lớp càng đông càng vui, em rủ thêm bạn nhé!'];
// Đuôi ngắn (≤ 8 từ) ghép vào câu mở tiết Điểm danh và câu Tổng kết (không thêm lượt đọc), xoay vòng không lặp liền. Giọng thân thiện, không ra lệnh gắt, không quà / điểm / link.
const SHARE_TAIL = ['Rủ bạn vào học cùng nhé!', 'Em rủ thêm bạn vào lớp nhé!', 'Có bạn cùng học thì vui hơn nhé!', 'Rủ bạn thân vào lớp cùng cô nhé!', 'Mời bạn bè vào lớp học vui nhé!', 'Nhớ rủ bạn cùng học nhé!'];
// Cảm ơn người vừa chia sẻ (gọi tên, gộp tối đa 3 tên, ≤ 1 câu / 60 giây). {who} = tên; THANK_ANON khi không có tên sạch. Không điểm / quà / huy hiệu.
const THANK_SHARE = ['Cảm ơn {who} đã rủ bạn vào lớp!', '{who} vừa rủ bạn vào lớp, cô cảm ơn nhé!', 'Cô cảm ơn {who} đã chia sẻ lớp học!'];
const THANK_ANON = ['Cảm ơn các bạn đã rủ bạn vào lớp!', 'Cô cảm ơn các bạn đã chia sẻ lớp học!'];
module.exports = { TIPS, SHARE, GOAL, GOAL_VOICE, SHARE_TAIL, THANK_SHARE, THANK_ANON };
