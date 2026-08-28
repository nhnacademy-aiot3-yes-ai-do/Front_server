lucide.createIcons();

(function renderTodayLabel() {
    var DOW = ['일', '월', '화', '수', '목', '금', '토'];
    var today = new Date();
    document.getElementById('admin-today-date').textContent =
        today.getFullYear() + '년 ' + (today.getMonth() + 1) + '월 ' + today.getDate() + '일 (' + DOW[today.getDay()] + ') 오늘도 MushMush를 살펴봐요';
})();
