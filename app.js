const STORAGE_KEY = "daily-habit-checkins";

const starterHabits = [
  {
    id: createId(),
    name: "早睡 30 分钟",
    completedDates: []
  },
  {
    id: createId(),
    name: "阅读 20 分钟",
    completedDates: []
  },
  {
    id: createId(),
    name: "运动或散步",
    completedDates: []
  }
];

const elements = {
  form: document.querySelector("#habit-form"),
  input: document.querySelector("#habit-name"),
  habitList: document.querySelector("#habit-list"),
  template: document.querySelector("#habit-template"),
  emptyState: document.querySelector("#empty-state"),
  resetToday: document.querySelector("#reset-today"),
  today: document.querySelector("#today"),
  weekday: document.querySelector("#weekday"),
  completedCount: document.querySelector("#completed-count"),
  completionRate: document.querySelector("#completion-rate"),
  progressBar: document.querySelector("#progress-bar"),
  bestStreak: document.querySelector("#best-streak")
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric"
});

const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  weekday: "long"
});

let habits = loadHabits();

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = elements.input.value.trim();
  if (!name) return;

  habits = [
    ...habits,
    {
      id: createId(),
      name,
      completedDates: []
    }
  ];

  elements.input.value = "";
  saveAndRender();
});

elements.resetToday.addEventListener("click", () => {
  const todayKey = getDateKey();
  habits = habits.map((habit) => ({
    ...habit,
    completedDates: habit.completedDates.filter((date) => date !== todayKey)
  }));
  saveAndRender();
});

render();

function loadHabits() {
  const storedHabits = localStorage.getItem(STORAGE_KEY);
  if (!storedHabits) {
    return starterHabits;
  }

  try {
    const parsed = JSON.parse(storedHabits);
    if (!Array.isArray(parsed)) {
      return starterHabits;
    }

    return parsed.map((habit) => ({
      id: habit.id ?? createId(),
      name: String(habit.name ?? "未命名习惯").slice(0, 28),
      completedDates: Array.isArray(habit.completedDates)
        ? [...new Set(habit.completedDates.filter(isDateKey))]
        : []
    }));
  } catch {
    return starterHabits;
  }
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  render();
}

function render() {
  const now = new Date();
  const todayKey = getDateKey(now);

  elements.today.textContent = dateFormatter.format(now);
  elements.weekday.textContent = weekdayFormatter.format(now);

  elements.habitList.innerHTML = "";
  elements.emptyState.hidden = habits.length > 0;
  elements.resetToday.disabled = habits.length === 0;

  habits.forEach((habit) => {
    elements.habitList.appendChild(createHabitCard(habit, todayKey));
  });

  renderStats(todayKey);
}

function createHabitCard(habit, todayKey) {
  const fragment = elements.template.content.cloneNode(true);
  const card = fragment.querySelector(".habit-card");
  const checkButton = fragment.querySelector(".check-button");
  const title = fragment.querySelector("h3");
  const meta = fragment.querySelector("p");
  const calendar = fragment.querySelector(".mini-calendar");
  const deleteButton = fragment.querySelector(".delete-button");
  const completedToday = habit.completedDates.includes(todayKey);
  const streak = getCurrentStreak(habit.completedDates);

  card.classList.toggle("is-complete", completedToday);
  checkButton.setAttribute(
    "aria-label",
    completedToday ? `取消 ${habit.name} 今日打卡` : `完成 ${habit.name} 今日打卡`
  );
  title.textContent = habit.name;
  meta.textContent = `连续 ${streak} 天 · 累计 ${habit.completedDates.length} 次`;

  getRecentDays().forEach((day) => {
    const dot = document.createElement("span");
    dot.className = "day-dot";
    dot.textContent = String(new Date(`${day}T00:00:00`).getDate());
    dot.title = day;
    dot.classList.toggle("done", habit.completedDates.includes(day));
    calendar.appendChild(dot);
  });

  checkButton.addEventListener("click", () => {
    toggleToday(habit.id);
  });

  deleteButton.addEventListener("click", () => {
    removeHabit(habit.id);
  });

  return fragment;
}

function renderStats(todayKey) {
  const total = habits.length;
  const completed = habits.filter((habit) => habit.completedDates.includes(todayKey)).length;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
  const bestStreak = habits.reduce(
    (best, habit) => Math.max(best, getCurrentStreak(habit.completedDates)),
    0
  );

  elements.completedCount.textContent = `${completed}/${total}`;
  elements.completionRate.textContent = `${rate}%`;
  elements.progressBar.style.width = `${rate}%`;
  elements.bestStreak.textContent = `${bestStreak} 天`;
}

function toggleToday(habitId) {
  const todayKey = getDateKey();

  habits = habits.map((habit) => {
    if (habit.id !== habitId) {
      return habit;
    }

    const alreadyDone = habit.completedDates.includes(todayKey);
    const completedDates = alreadyDone
      ? habit.completedDates.filter((date) => date !== todayKey)
      : [...habit.completedDates, todayKey].sort();

    return {
      ...habit,
      completedDates
    };
  });

  saveAndRender();
}

function removeHabit(habitId) {
  habits = habits.filter((habit) => habit.id !== habitId);
  saveAndRender();
}

function getCurrentStreak(completedDates) {
  const completed = new Set(completedDates);
  let streak = 0;
  let cursor = new Date(`${getDateKey()}T00:00:00`);

  while (completed.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getRecentDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return getDateKey(date);
  });
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `habit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
