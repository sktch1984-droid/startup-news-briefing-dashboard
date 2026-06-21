document.addEventListener("DOMContentLoaded", () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    document.getElementById("headerDate").textContent = dateStr;
    document.getElementById("footerDate").textContent = dateStr;

    // Filter logic
    const filterBtns = document.querySelectorAll(".filter-btn");
    const cards = document.querySelectorAll(".report-card");

    let activeCategory = "all";
    let activeStatus = "all";

    function applyFilters() {
        cards.forEach(card => {
            const cat = card.dataset.category;
            const status = card.dataset.status;
            const catMatch = activeCategory === "all" || cat === activeCategory;
            const statusMatch = activeStatus === "all" || status === activeStatus;
            card.classList.toggle("hidden", !(catMatch && statusMatch));
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.filter !== undefined) {
                document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                activeCategory = btn.dataset.filter;
            }
            if (btn.dataset.status !== undefined) {
                document.querySelectorAll("[data-status]:not(.report-card)").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                activeStatus = btn.dataset.status === "progress" ? "progress" : btn.dataset.status === "live" ? "live" : "all";
            }
            applyFilters();
        });
    });

    // Today line position
    const startMonth = 4;
    const endMonth = 12;
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (currentMonth >= startMonth && currentMonth <= endMonth) {
        const monthIndex = currentMonth - startMonth;
        const fraction = (currentDay - 1) / daysInMonth;
        const totalCols = endMonth - startMonth + 1;
        const pct = ((monthIndex + fraction) / totalCols) * 100;
        const labelColWidth = 150;
        const todayLine = document.getElementById("todayLine");
        if (todayLine && todayLine.parentElement) {
            const bodyEl = todayLine.parentElement;
            const updateLine = () => {
                const bodyWidth = bodyEl.offsetWidth;
                const barArea = bodyWidth - labelColWidth;
                const left = labelColWidth + (barArea * pct / 100);
                todayLine.style.left = left + "px";
            };
            updateLine();
            window.addEventListener("resize", updateLine);
        }
    }

    // Card entrance animation
    cards.forEach((card, i) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        setTimeout(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }, 150 * i);
    });
});
