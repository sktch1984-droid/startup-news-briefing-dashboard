document.addEventListener("DOMContentLoaded", async () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    document.getElementById("headerDate").textContent = dateStr;
    document.getElementById("footerDate").textContent = dateStr;

    const REPO = "sktch1984-droid/startup-news-briefing-dashboard";
    const FILE_PATH = "reports.json";
    const BRANCH = "main";

    // Load reports
    let reports = [];
    try {
        const res = await fetch("reports.json?t=" + Date.now());
        reports = await res.json();
    } catch (e) {
        reports = [];
    }

    function renderDetailBlock(block) {
        if (block.type === "description") {
            return `<p class="detail-desc">${block.text}</p>`;
        }
        if (block.type === "highlights") {
            return `<ul class="detail-highlights">${block.items.map(i => `<li><i class="fa-solid fa-check" style="color:var(--cat-data);margin-right:6px;font-size:0.7rem;"></i>${i}</li>`).join("")}</ul>`;
        }
        if (block.type === "milestones") {
            return `<div class="card-milestones" style="margin:8px 0;">${block.items.map(ms => `
                <div class="milestone">
                    <span class="ms-dot ${ms.status}"></span>
                    <span class="ms-label">${ms.label}</span>
                </div>
            `).join("")}</div>`;
        }
        if (block.type === "persona-list") {
            return block.items.map(i => `
                <div class="persona-card">
                    <div class="persona-header">
                        <span class="persona-num">${i.num}</span>
                        <strong class="persona-name">${i.name}</strong>
                    </div>
                    <div class="persona-body">
                        <div class="persona-row"><span class="persona-tag">역할</span><span>${i.role}</span></div>
                        <div class="persona-row"><span class="persona-tag tag-verify">검증</span><span>${i.verify}</span></div>
                    </div>
                </div>
            `).join("");
        }
        if (block.type === "feedback-list") {
            return block.items.map(i => `
                <div class="detail-feedback-item">
                    <span class="fb-badge fb-${i.color}">${i.category}</span>
                    <span class="fb-text">${i.text}</span>
                </div>
            `).join("");
        }
        if (block.type === "request-list") {
            return block.items.map((i, idx) => `
                <div class="detail-request-item">
                    <div class="rq-header">
                        <span class="rq-num">${idx + 1}</span>
                        <strong>${i.title}</strong>
                        <span class="rq-feasibility rq-f-${i.feasibilityColor || 'green'}">${i.feasibility || ''}</span>
                        ${i.schedule ? `<span class="rq-schedule"><i class="fa-regular fa-calendar"></i> ${i.schedule}</span>` : ''}
                    </div>
                    ${i.details && i.details.length ? `
                        <ul class="rq-details">
                            ${i.details.map(d => `<li>${d}</li>`).join("")}
                        </ul>
                    ` : ''}
                    ${i.devNote ? `<div class="rq-dev-note"><i class="fa-solid fa-code"></i> <strong>개발 의견:</strong> ${i.devNote}</div>` : ''}
                </div>
            `).join("");
        }
        return "";
    }

    const GROUP_COLORS = {
        "1": { border: "#8b5cf6", bg: "rgba(139,92,246,0.04)" },
        "2": { border: "#0ea5e9", bg: "rgba(14,165,233,0.04)" },
        "3": { border: "#10b981", bg: "rgba(16,185,129,0.04)" },
        "4": { border: "#f59e0b", bg: "rgba(245,158,11,0.04)" },
        "5": { border: "#ef4444", bg: "rgba(239,68,68,0.04)" },
        "6": { border: "#ec4899", bg: "rgba(236,72,153,0.04)" },
    };

    function getGroupNum(title) {
        const m = title.match(/^\[(\d+)/);
        return m ? m[1] : null;
    }

    renderDashboard(reports);

    // Add report button
    document.getElementById("addReportBtn").addEventListener("click", () => {
        document.getElementById("addModal").classList.add("show");
    });
    document.getElementById("modalClose").addEventListener("click", () => {
        document.getElementById("addModal").classList.remove("show");
    });
    document.getElementById("addModal").addEventListener("click", (e) => {
        if (e.target.id === "addModal") document.getElementById("addModal").classList.remove("show");
    });

    // Token settings
    document.getElementById("tokenBtn").addEventListener("click", () => {
        const current = localStorage.getItem("gh_token") || "";
        const token = prompt("GitHub Personal Access Token 입력:", current);
        if (token !== null) {
            localStorage.setItem("gh_token", token);
            alert("토큰이 저장되었습니다.");
        }
    });

    // Form submit
    document.getElementById("reportForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("gh_token");
        if (!token) {
            alert("먼저 GitHub 토큰을 설정해주세요. (우측 상단 열쇠 아이콘)");
            return;
        }

        const form = e.target;
        const newReport = {
            id: form.reportId.value.trim(),
            title: form.reportTitle.value.trim(),
            category: form.reportCategory.value,
            categoryLabel: form.reportCategory.options[form.reportCategory.selectedIndex].text,
            status: form.reportStatus.value,
            statusLabel: form.reportStatus.value === "progress" ? "진행중" : "운영중",
            summary: form.reportSummary.value.trim(),
            keywords: form.reportKeywords.value.split(",").map(k => k.trim()).filter(Boolean),
            url: form.reportUrl.value.trim(),
            meta: [
                { icon: "fa-regular fa-calendar", text: form.reportPeriod.value.trim() }
            ],
            milestones: form.reportMilestones.value.split("\n").map(line => {
                line = line.trim();
                if (!line) return null;
                let status = "upcoming";
                if (line.startsWith("[done]")) { status = "done"; line = line.replace("[done]", "").trim(); }
                else if (line.startsWith("[current]")) { status = "current"; line = line.replace("[current]", "").trim(); }
                else if (line.startsWith("[upcoming]")) { status = "upcoming"; line = line.replace("[upcoming]", "").trim(); }
                return { status, label: line };
            }).filter(Boolean),
            timeline: parseTimeline(form.reportTimeline.value)
        };

        reports.push(newReport);

        const submitBtn = form.querySelector("button[type=submit]");
        submitBtn.disabled = true;
        submitBtn.textContent = "저장 중...";

        try {
            await saveToGitHub(token, reports);
            alert("보고서가 추가되었습니다!");
            document.getElementById("addModal").classList.remove("show");
            form.reset();
            renderDashboard(reports);
        } catch (err) {
            alert("저장 실패: " + err.message);
            reports.pop();
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "보고서 추가";
        }
    });

    function parseTimeline(val) {
        return val.split("\n").map(line => {
            line = line.trim();
            if (!line) return null;
            const match = line.match(/^(\d+)-(\d+)\s+(.+?)(\s+\[active\]|\s+\[future\])?$/);
            if (!match) return null;
            const obj = { start: parseInt(match[1]), end: parseInt(match[2]), label: match[3].trim() };
            if (match[4] && match[4].includes("active")) obj.active = true;
            if (match[4] && match[4].includes("future")) obj.future = true;
            return obj;
        }).filter(Boolean);
    }

    async function saveToGitHub(token, data) {
        const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!getRes.ok) throw new Error("파일 조회 실패 (" + getRes.status + ")");
        const fileInfo = await getRes.json();
        const sha = fileInfo.sha;

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Add report: " + data[data.length - 1].title,
                content: content,
                sha: sha,
                branch: BRANCH
            })
        });
        if (!putRes.ok) {
            const err = await putRes.json();
            throw new Error(err.message || putRes.status);
        }
    }

    function renderDashboard(reports) {
        const totalCount = reports.length;
        const progressCount = reports.filter(r => r.status === "progress").length;
        const liveCount = reports.filter(r => r.status === "live").length;
        const categories = [...new Set(reports.map(r => r.categoryLabel))];

        document.getElementById("headerBadge").textContent = totalCount + " Projects";

        document.getElementById("statsBar").innerHTML = `
            <div class="stat-chip"><i class="fa-solid fa-folder-open"></i><span>전체 보고서 <strong>${totalCount}</strong></span></div>
            <div class="stat-chip"><i class="fa-solid fa-spinner fa-spin-pulse"></i><span>진행중 <strong>${progressCount}</strong></span></div>
            <div class="stat-chip"><i class="fa-solid fa-check-circle"></i><span>운영중 <strong>${liveCount}</strong></span></div>
            <div class="stat-chip"><i class="fa-solid fa-tags"></i><span>카테고리 <strong>${categories.length}</strong></span></div>
        `;

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

        const grid = document.getElementById("reportGrid");
        grid.innerHTML = reports.map(r => {
            const gn = getGroupNum(r.title);
            const gc = gn && GROUP_COLORS[gn] ? GROUP_COLORS[gn] : null;
            const cardStyle = gc ? `background: ${gc.bg};` : '';
            return `
            <article class="report-card" data-category="${r.category}" data-status="${r.status}" style="${cardStyle}">
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
                ${r.detail ? `
                <div class="card-detail">
                    <button class="detail-toggle" data-id="${r.id}"><i class="fa-solid fa-chevron-down"></i> 상세 보기</button>
                    <div class="detail-panel" id="detail-${r.id}">
                        <div class="detail-tabs">
                            ${r.detail.tabs.map((tab, ti) => `
                                <button class="detail-tab${ti === 0 ? ' active' : ''}" data-tab="${tab.id}" data-parent="${r.id}">
                                    <i class="${tab.icon}"></i> ${tab.label}
                                </button>
                            `).join("")}
                        </div>
                        <div class="detail-tab-contents">
                            ${r.detail.tabs.map((tab, ti) => `
                                <div class="detail-tab-content${ti === 0 ? ' active' : ''}" data-tab-content="${tab.id}" data-parent="${r.id}">
                                    ${tab.content.map(block => renderDetailBlock(block)).join("")}
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
                ` : ''}
            </article>
        `}).join("");

        // Detail toggle & tabs
        document.querySelectorAll(".detail-toggle").forEach(btn => {
            btn.addEventListener("click", () => {
                const panel = document.getElementById("detail-" + btn.dataset.id);
                const isOpen = panel.classList.contains("open");
                panel.classList.toggle("open");
                btn.innerHTML = isOpen
                    ? '<i class="fa-solid fa-chevron-down"></i> 상세 보기'
                    : '<i class="fa-solid fa-chevron-up"></i> 접기';
            });
        });
        document.querySelectorAll(".detail-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                const parent = tab.dataset.parent;
                document.querySelectorAll(`.detail-tab[data-parent="${parent}"]`).forEach(t => t.classList.remove("active"));
                document.querySelectorAll(`.detail-tab-content[data-parent="${parent}"]`).forEach(c => c.classList.remove("active"));
                tab.classList.add("active");
                document.querySelector(`.detail-tab-content[data-tab-content="${tab.dataset.tab}"][data-parent="${parent}"]`).classList.add("active");
            });
        });

        // Timeline
        const timelineBody = document.getElementById("timelineBody");
        timelineBody.innerHTML = '<div class="today-line" id="todayLine"></div>';
        const tlRows = reports.map(r => {
            const bars = (r.timeline || []).map(t => {
                let cls = `tl-bar cat-${r.category}-bar`;
                if (t.active) cls += " bar-active";
                if (t.future) cls += " bar-future";
                return `<div class="${cls}" style="grid-column: ${t.start} / ${t.end};"><span class="tl-bar-text">${t.label}</span></div>`;
            }).join("");
            let shortName = r.title.length > 12 ? r.categoryLabel : r.title;
            const bracketMatch = r.title.match(/^\[(\d+)-/);
            if (bracketMatch && r.id === "ai-interview-agent") shortName = "AI/AX(심사문항)";
            return `
                <div class="tl-row">
                    <div class="tl-label-col">
                        <span class="tl-dot cat-${r.category}-bg"></span>
                        <span>${shortName}</span>
                    </div>
                    <div class="tl-months">${bars}</div>
                </div>
            `;
        }).join("");
        timelineBody.insertAdjacentHTML("beforeend", tlRows);

        // Filters
        let activeCategory = "all";
        let activeStatus = "all";
        const cards = () => document.querySelectorAll(".report-card");

        function applyFilters() {
            cards().forEach(card => {
                const cat = card.dataset.category;
                const st = card.dataset.status;
                const catMatch = activeCategory === "all" || cat === activeCategory;
                const stMatch = activeStatus === "all" || st === activeStatus;
                card.classList.toggle("hidden", !(catMatch && stMatch));
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
        const startMonth = 4, endMonth = 12;
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
                    todayLine.style.left = (labelColWidth + barArea * pct / 100) + "px";
                };
                updateLine();
                window.addEventListener("resize", updateLine);
            }
        }

        // Entrance animation
        cards().forEach((card, i) => {
            card.style.opacity = "0";
            card.style.transform = "translateY(20px)";
            card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
            setTimeout(() => { card.style.opacity = "1"; card.style.transform = "translateY(0)"; }, 150 * i);
        });
    }
});
