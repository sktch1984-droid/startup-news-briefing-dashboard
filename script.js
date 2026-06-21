document.addEventListener("DOMContentLoaded", async () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    document.getElementById("headerDate").textContent = dateStr;
    document.getElementById("footerDate").textContent = dateStr;

    const res = await fetch("reports.json");
    const reports = await res.json();

    const totalCount = reports.length;
    const progressCount = reports.filter(r => r.status === "progress").length;
    const liveCount = reports.filter(r => r.status === "live").length;
    const categories = [...new Set(reports.map(r => r.categoryLabel))];

    document.getElementById("headerBadge").textContent = totalCount + " Projects";

    // Stats bar
    document.getElementById("statsBar").innerHTML = `
        <div class="stat-chip"><i class="fa-solid fa-folder-open"></i><span>전체 보고서 <strong>${totalCount}</strong></span></div>
        <div class="stat-chip"><i class="fa-solid fa-spinner fa-spin-pulse"></i><span>진행중 <strong>${progressCount}</strong></span></div>
        <div class="stat-chip"><i class="fa-solid fa-check-circle"></i><span>운영중 <strong>${liveCount}</strong></span></div>
        <div class="stat-chip"><i class="fa-solid fa-tags"></i><span>카테고리 <strong>${categories.length}</strong></span></div>
    `;

    // Category filters
    const catMap = [{ filter: "all", label: "전체" }];
    reports.forEach(r => {
        if (!catMap.find(c => c.filter === r.category)) {
            catMap.push({ filter: r.category, label: r.categoryLabel });
        }
    });
    document.getElementById("categoryFilters").innerHTML = catMap.map((c, i) =>
        `<button class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${c.filter}">${c.label}</button>`
    ).join("");

    document.getElementById("statusFilters").innerHTML = `
        <button class="filter-btn active" data-status="all">모든 상태</button>
        <button class="filter-btn" data-status="progress">진행중</button>
        <button class="filter-btn" data-status="live">운영중</button>
    `;

    // Render cards
    const grid = document.getElementById("reportGrid");
    grid.innerHTML = reports.map(r => `
        <article class="report-card" data-category="${r.category}" data-status="${r.status}">
            <div class="card-top">
                <div class="card-badges">
                    <span class="cat-badge cat-${r.category}">${r.categoryLabel}</span>
                    <span class="status-badge status-${r.status}">${r.statusLabel}</span>
                </div>
                <a href="${r.url}" target="_blank" class="card-link" title="보고서 열기"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
            </div>
            <h3 class="card-title">${r.title}</h3>
            <p class="card-summary">${r.summary}</p>
            <div class="card-keywords">
                ${r.keywords.map(k => `<span class="keyword">${k}</span>`).join("")}
            </div>
            <div class="card-meta">
                ${r.meta.map(m => `<div class="meta-item"><i class="${m.icon}"></i> ${m.text}</div>`).join("")}
            </div>
            <div class="card-milestones">
                ${r.milestones.map(ms => `
                    <div class="milestone">
                        <span class="ms-dot ${ms.status}"></span>
                        <span class="ms-label">${ms.label}</span>
                    </div>
                `).join("")}
            </div>
        </article>
    `).join("");

    // Render timeline rows
    const timelineBody = document.getElementById("timelineBody");
    const tlRows = reports.map(r => {
        const bars = r.timeline.map(t => {
            let cls = `tl-bar cat-${r.category}-bar`;
            if (t.active) cls += " bar-active";
            if (t.future) cls += " bar-future";
            return `<div class="${cls}" style="grid-column: ${t.start} / ${t.end};"><span class="tl-bar-text">${t.label}</span></div>`;
        }).join("");
        return `
            <div class="tl-row">
                <div class="tl-label-col">
                    <span class="tl-dot cat-${r.category}-bg"></span>
                    <span>${r.title.length > 12 ? r.categoryLabel : r.title}</span>
                </div>
                <div class="tl-months">${bars}</div>
            </div>
        `;
    }).join("");
    timelineBody.insertAdjacentHTML("beforeend", tlRows);

    // Filter logic
    let activeCategory = "all";
    let activeStatus = "all";
    const cards = () => document.querySelectorAll(".report-card");

    function applyFilters() {
        cards().forEach(card => {
            const cat = card.dataset.category;
            const status = card.dataset.status;
            const catMatch = activeCategory === "all" || cat === activeCategory;
            const statusMatch = activeStatus === "all" || status === activeStatus;
            card.classList.toggle("hidden", !(catMatch && statusMatch));
        });
    }

    document.querySelectorAll(".filter-btn").forEach(btn => {
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

    // Today line
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
    cards().forEach((card, i) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        setTimeout(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }, 150 * i);
    });
});
