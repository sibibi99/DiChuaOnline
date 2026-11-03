// Bài giảng ngắn đọc khi live vắng tương tác: xen kẽ "lời an lạc" (giáo lý phổ thông) và "chuyện đời" (bài học cuộc sống).
// Mỗi bài 3–4 câu ngắn để giọng đọc tạo nhanh; có người bình luận / tặng quà thì đọc người đó trước rồi giảng tiếp câu sau.
// Luật chữ: không hứa phước / may mắn / chữa bệnh, không xin quà, không xưng thầy — chỉ chia sẻ cách sống an.
// Ghi đè hoặc thêm bài bằng config.talks.list: [{ k: 'phap'|'doi', title, parts: [...] }]
const TALKS = [
  // ---------- lời an lạc ----------
  { k: 'phap', title: 'Vô thường', parts: [
    'A Di Đà Phật. Đức Phật dạy, mọi thứ trên đời đều vô thường, có đến thì có đi.',
    'Niềm vui rồi sẽ qua, nỗi buồn cũng vậy. Hiểu được điều đó, ta bớt níu kéo và bớt sợ hãi.',
    'Hôm nay có gì làm quý vị lo lắng, hãy nhẹ nhàng nhắc mình: rồi chuyện này cũng sẽ qua.' ] },
  { k: 'phap', title: 'Cục than hồng', parts: [
    'Người xưa ví giận dữ như cầm một cục than hồng để ném vào người khác.',
    'Chưa kịp ném đi, chính bàn tay mình đã bị bỏng trước.',
    'Khi cơn giận nổi lên, hãy thở vào một hơi thật sâu, thở ra thật chậm, rồi hãy nói.' ] },
  { k: 'phap', title: 'Trở về hơi thở', parts: [
    'Mời quý vị cùng dừng lại một chút. Hít vào, biết mình đang hít vào.',
    'Thở ra, biết mình đang thở ra. Chỉ vậy thôi, tâm đã lắng xuống một phần.',
    'Hơi thở luôn ở bên ta. Mỗi khi rối lòng, hãy trở về với hơi thở của mình.' ] },
  { k: 'phap', title: 'Biết đủ', parts: [
    'Lời Phật dạy: biết đủ là giàu có nhất.',
    'Người không biết đủ, có bao nhiêu vẫn thấy thiếu. Người biết đủ, có một bát cơm nóng cũng thấy ấm lòng.',
    'Tối nay, quý vị thử đếm ba điều mình đang có và thầm cảm ơn những điều đó.' ] },
  { k: 'phap', title: 'Lời nói ái ngữ', parts: [
    'Lời nói không mất tiền mua, nhưng có thể làm ấm hoặc làm đau lòng người.',
    'Nhà Phật gọi là ái ngữ, tức là nói lời dịu dàng, chân thật, đúng lúc.',
    'Hôm nay, mình thử nói với người thân một câu thật dịu dàng, xem không khí trong nhà có khác không.' ] },
  { k: 'phap', title: 'Tâm như mặt hồ', parts: [
    'Tâm người giống như mặt hồ. Khi gió nổi, nước đục, ta chẳng nhìn thấy gì.',
    'Khi gió lặng, nước trong, ta thấy cả trời xanh và mây trắng.',
    'Đừng vội quyết định điều gì khi tâm đang dậy sóng. Đợi lòng lắng lại, mọi việc sẽ rõ ràng hơn.' ] },
  { k: 'phap', title: 'Gieo hạt lành', parts: [
    'Tâm ta như một mảnh vườn, có hạt giống thương yêu và cũng có hạt giống giận hờn.',
    'Ta tưới hạt nào nhiều, hạt đó sẽ lớn mạnh.',
    'Mỗi ngày một lời tử tế, một việc tử tế nhỏ, là đang tưới cho hạt giống an vui trong lòng mình.' ] },
  { k: 'phap', title: 'Sống trong hiện tại', parts: [
    'Quá khứ đã qua, tương lai chưa tới. Chỉ có giây phút này là thật.',
    'Ăn cơm thì biết mình đang ăn cơm, đi bộ thì biết mình đang đi bộ.',
    'Sống trọn từng phút giây, đó cũng là một cách tu tập giữa đời thường.' ] },
  { k: 'phap', title: 'Buông bỏ', parts: [
    'Buông bỏ không phải là bỏ mặc, mà là thôi ôm chặt những điều làm mình đau.',
    'Có những lời nói cũ, những chuyện đã qua, ta mang theo mãi mà không biết đặt xuống.',
    'Mời quý vị thở ra thật chậm, và đặt xuống một gánh nặng nhỏ trong lòng ngay lúc này.' ] },
  { k: 'phap', title: 'Từ bi với chính mình', parts: [
    'Nhiều người rất thương người khác, nhưng lại quá khắt khe với chính mình.',
    'Lòng từ bi bắt đầu từ việc biết thương thân mình: ăn đủ, ngủ đủ, cho mình được nghỉ ngơi.',
    'Hôm nay nếu có lỡ sai một điều, hãy tha thứ cho mình, rồi làm lại cho tốt hơn.' ] },
  { k: 'phap', title: 'Ân cha mẹ', parts: [
    'Trong đạo Phật, ân cha mẹ được nhắc đến đầu tiên trong những ân phải nhớ.',
    'Cha mẹ không cần mình giàu sang, chỉ mong con bình an và thỉnh thoảng hỏi han.',
    'Nếu còn cha mẹ, tối nay quý vị hãy gọi một cuộc điện thoại ngắn về nhà nhé.' ] },
  { k: 'phap', title: 'Tha thứ', parts: [
    'Tha thứ không có nghĩa là người kia đúng, mà là mình không muốn mang nỗi đau thêm nữa.',
    'Giữ hận trong lòng giống như tự uống thuốc đắng mà mong người khác thấy đắng.',
    'Mở lòng tha thứ, người nhẹ nhõm đầu tiên chính là mình.' ] },
  { k: 'phap', title: 'Lắng nghe sâu', parts: [
    'Có khi người thân không cần lời khuyên, họ chỉ cần được lắng nghe.',
    'Lắng nghe với tất cả sự chú tâm, không ngắt lời, không phán xét, là một món quà rất quý.',
    'Hôm nay, mình thử làm người lắng nghe cho một người mình thương.' ] },
  { k: 'phap', title: 'Gieo nhân lành', parts: [
    'Ông bà ta dạy: ở hiền gặp lành, gieo gió thì gặt bão.',
    'Mỗi suy nghĩ, lời nói và việc làm hôm nay đều góp phần tạo nên con người mình ngày mai.',
    'Không cần việc lớn, chỉ cần mỗi ngày bớt một lời nặng, thêm một nụ cười.' ] },
  { k: 'phap', title: 'Cho đi', parts: [
    'Cho đi không nhất thiết là tiền bạc. Một nụ cười, một lời hỏi thăm cũng là cho đi.',
    'Nhường đường cho người vội, kiên nhẫn với người lớn tuổi, đó đều là những món quà nhỏ.',
    'Kỳ lạ thay, càng cho đi điều tử tế, lòng mình càng thấy đầy đặn.' ] },
  { k: 'phap', title: 'Khổ vì bám chấp', parts: [
    'Đức Phật dạy, khổ đau thường đến từ sự bám chấp, muốn mọi thứ phải theo ý mình.',
    'Người khác có cách sống riêng, cuộc đời có nhịp đi riêng.',
    'Khi bớt đòi hỏi mọi thứ phải vừa ý, ta sẽ thấy lòng rộng ra rất nhiều.' ] },

  // ---------- chuyện đời ----------
  { k: 'doi', title: 'Ly nước trên tay', parts: [
    'Có một câu chuyện nhỏ. Người thầy giơ một ly nước và hỏi, ly nước này nặng bao nhiêu?',
    'Cầm một phút thì nhẹ tênh. Cầm một giờ thì mỏi tay. Cầm cả ngày thì tay tê dại.',
    'Nỗi lo cũng vậy, nghĩ một lúc thì không sao, ôm mãi thì nặng trĩu. Thỉnh thoảng hãy đặt ly nước xuống.' ] },
  { k: 'doi', title: 'Cây tre trong bão', parts: [
    'Sau cơn bão lớn, cây cổ thụ cứng cáp bị gãy, còn bụi tre vẫn đứng đó.',
    'Vì tre biết nghiêng mình theo gió, bão qua lại thẳng lưng lên.',
    'Trong cuộc sống, mềm mỏng đúng lúc không phải là yếu, mà là cách để không bị gãy.' ] },
  { k: 'doi', title: 'Chiếc bình nứt', parts: [
    'Người gánh nước có hai chiếc bình, một chiếc bị nứt, đi tới nhà chỉ còn một nửa nước.',
    'Chiếc bình nứt buồn lắm, cho đến khi thấy cả con đường bên phía nó nở đầy hoa.',
    'Người gánh nước đã gieo hạt bên ấy từ lâu. Mỗi người đều có chỗ chưa tròn, nhưng ai cũng có ích theo cách riêng.' ] },
  { k: 'doi', title: 'Bữa cơm gia đình', parts: [
    'Ngày nào cũng bận rộn, nhiều nhà ít khi ngồi ăn cùng nhau.',
    'Một bữa cơm đơn giản, cả nhà cùng ngồi, cất điện thoại sang một bên, là lúc gia đình gần nhau nhất.',
    'Cuối tuần này, mình thử nấu một bữa cơm và mời cả nhà cùng ăn nhé.' ] },
  { k: 'doi', title: 'Đừng so sánh', parts: [
    'Trên mạng ai cũng khoe phần đẹp nhất của đời mình.',
    'Nhìn vào đó rồi so với những ngày mệt mỏi của mình, ta dễ thấy buồn và thiếu thốn.',
    'Mỗi người có một con đường. Chỉ cần hôm nay mình tốt hơn hôm qua một chút là đủ.' ] },
  { k: 'doi', title: 'Chữ cảm ơn', parts: [
    'Cảm ơn là hai chữ đơn giản nhưng nhiều người lại ngại nói với người thân nhất.',
    'Cảm ơn mẹ bữa cơm, cảm ơn vợ chồng đã vất vả, cảm ơn đồng nghiệp đã giúp một tay.',
    'Nói ra rồi, mình sẽ thấy cả hai người cùng ấm lòng.' ] },
  { k: 'doi', title: 'Ngày mệt mỏi', parts: [
    'Có những ngày làm việc mệt nhoài, về nhà chỉ muốn im lặng.',
    'Không sao cả. Mệt thì nghỉ, đừng tự trách mình là yếu đuối.',
    'Ngủ một giấc thật sâu, sáng mai thức dậy, mình lại có sức bước tiếp.' ] },
  { k: 'doi', title: 'Thất bại', parts: [
    'Không ai đi một mạch mà chưa từng vấp ngã.',
    'Thất bại không nói rằng mình kém cỏi, nó chỉ cho mình biết cách đó chưa đúng.',
    'Đứng dậy, phủi bụi, rút ra một bài học, rồi bước tiếp. Người kiên nhẫn sẽ tới đích.' ] },
  { k: 'doi', title: 'Cha mẹ già', parts: [
    'Ngày nhỏ, cha mẹ kiên nhẫn trả lời ta cả trăm câu hỏi ngây ngô.',
    'Khi cha mẹ già, có lúc hỏi đi hỏi lại một chuyện, mình lại thấy phiền.',
    'Xin hãy chậm lại một chút, kiên nhẫn như ngày xưa cha mẹ đã kiên nhẫn với mình.' ] },
  { k: 'doi', title: 'Đủ là hạnh phúc', parts: [
    'Có người cả đời chạy theo nhiều hơn, nhà to hơn, xe đẹp hơn, mà quên mất hôm nay.',
    'Tiền bạc cần thiết, nhưng đủ ăn, đủ mặc, có người để thương, đã là rất quý.',
    'Làm việc chăm chỉ, nhưng đừng quên dừng lại để tận hưởng những gì đang có.' ] },
  { k: 'doi', title: 'Bạn thật', parts: [
    'Lúc vui, quanh mình có rất nhiều người. Lúc khó, mới biết ai là bạn thật.',
    'Không cần nhiều bạn, chỉ cần vài người hiểu mình và sẵn lòng ở bên.',
    'Hôm nay, hãy nhắn một tin hỏi thăm người bạn lâu rồi chưa gặp nhé.' ] },
  { k: 'doi', title: 'Nụ cười người lạ', parts: [
    'Một bác bảo vệ, một cô bán hàng, một anh giao hàng, ngày nào cũng gặp mà ít khi để ý.',
    'Một lời chào, một nụ cười của mình có thể làm ngày dài của họ nhẹ đi một chút.',
    'Tử tế với người lạ là cách đơn giản nhất để làm đời đẹp hơn.' ] },
  { k: 'doi', title: 'Đi chậm lại', parts: [
    'Sáng vội đi làm, trưa ăn vội, tối lướt điện thoại tới khuya. Một ngày trôi qua lúc nào không hay.',
    'Thử đi chậm lại một chút, ngắm trời, nghe tiếng chim, uống một ngụm nước thật chậm.',
    'Đời sống không ngắn lại khi ta đi chậm, nó chỉ trở nên đầy đặn hơn.' ] },
  { k: 'doi', title: 'Lời nói lúc nóng giận', parts: [
    'Một cậu bé hay nổi nóng, người cha bảo mỗi lần giận thì đóng một cây đinh lên hàng rào.',
    'Sau này cậu nhổ hết đinh ra, nhưng các lỗ đinh vẫn còn trên gỗ.',
    'Lời nói lúc giận cũng để lại vết như thế. Nói chậm một nhịp, sẽ đỡ phải hối tiếc.' ] },
  { k: 'doi', title: 'Con cái', parts: [
    'Con trẻ học từ cách cha mẹ sống nhiều hơn là từ lời cha mẹ dạy.',
    'Mình nói nhẹ nhàng, con sẽ học cách nhẹ nhàng. Mình biết xin lỗi, con sẽ học cách nhận lỗi.',
    'Muốn con tốt, hãy bắt đầu từ chính mình mỗi ngày.' ] },
  { k: 'doi', title: 'Ngủ sớm một hôm', parts: [
    'Nhiều người thức khuya lướt điện thoại, sáng dậy lại thấy mệt và dễ cáu.',
    'Tối nay thử đặt điện thoại xuống sớm hơn nửa tiếng, tắt đèn, nằm nghe hơi thở của mình.',
    'Một giấc ngủ yên là món quà mình tự tặng cho bản thân.' ] },
];

// câu nối cuối bài (xen ngẫu nhiên): mời tương tác miễn phí, không xin quà
const OUTROS = [
  'Quý vị thấy lời này hợp lòng thì thả một trái tim để cùng lan tỏa an lạc nhé.',
  'Ai đang lắng nghe, bình luận một chữ an để cùng giữ tâm an.',
  'Chat rút thẻ để nhận một thẻ chúc lành miễn phí hôm nay.',
  'Quý vị có điều gì muốn chia sẻ, cứ bình luận, không gian luôn lắng nghe.',
];
const KIND_NAME = { phap: 'Lời an lạc', doi: 'Chuyện đời' };

module.exports = { TALKS, OUTROS, KIND_NAME };
