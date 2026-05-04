import { EMPTY_MODEL, EXAMPLE_MODEL } from "./balancerData";

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(value, min, max) {
  const n = toNumber(value, min);
  return Math.max(min, Math.min(max, n));
}

export function positive(value, fallback = 0) {
  return Math.max(toNumber(value, fallback), 0);
}

export function positiveNonZero(value, fallback = 1) {
  return Math.max(toNumber(value, fallback), 0.000001);
}

export function compact(value) {
  const n = toNumber(value, 0);
  const abs = Math.abs(n);

  if (abs >= 1e30) return n.toExponential(2);
  if (abs >= 1e27) return `${(n / 1e27).toFixed(2)}Oc`;
  if (abs >= 1e24) return `${(n / 1e24).toFixed(2)}Sp`;
  if (abs >= 1e21) return `${(n / 1e21).toFixed(2)}Sx`;
  if (abs >= 1e18) return `${(n / 1e18).toFixed(2)}Qi`;
  if (abs >= 1e15) return `${(n / 1e15).toFixed(2)}Qa`;
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;

  return `${Math.round(n * 100) / 100}`;
}

export function timeText(seconds) {
  const n = toNumber(seconds, NaN);

  if (!Number.isFinite(n)) return "—";
  if (n < 0) return "Invalid";
  if (n < 60) return `${n.toFixed(0)}s`;
  if (n < 3600) return `${(n / 60).toFixed(1)}m`;
  if (n < 86400) return `${(n / 3600).toFixed(1)}h`;

  return `${(n / 86400).toFixed(1)}d`;
}

export function makeId(prefix, items) {
  let index = items.length + 1;
  let id = `${prefix}_${index}`;
  const ids = new Set(items.map((item) => item.id));

  while (ids.has(id)) {
    index += 1;
    id = `${prefix}_${index}`;
  }

  return id;
}

export function updateArrayItem(array, index, patch) {
  return array.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    return { ...item, ...patch };
  });
}

export function removeArrayItem(array, index) {
  return array.filter((_, itemIndex) => itemIndex !== index);
}

function normalizeArea(area, fallbackCurrencyId) {
  const base = area || {};
  const costs = Array.isArray(base.costs) ? base.costs : [];
  const rewards = Array.isArray(base.rewards) ? base.rewards : [];

  return {
    id: base.id || "area_1",
    name: base.name || "Area",
    costs: costs.map((cost) => ({
      currencyId: cost.currencyId || fallbackCurrencyId,
      amount: positive(cost.amount, 0)
    })),
    rewards: rewards.map((reward) => ({
      currencyId: reward.currencyId || fallbackCurrencyId,
      amount: positive(reward.amount, 0)
    }))
  };
}

export function normalizeModel(model) {
  const source = model || EMPTY_MODEL;
  const currencies =
    Array.isArray(source.currencies) && source.currencies.length
      ? source.currencies
      : clone(EMPTY_MODEL.currencies);

  const normalizedCurrencies = currencies.map((currency, index) => ({
    id: currency.id || `currency_${index + 1}`,
    name: currency.name || `Currency ${index + 1}`,
    startingAmount: positive(currency.startingAmount, 0)
  }));

  const fallbackCurrencyId = normalizedCurrencies[0].id;
  const currencyIds = new Set(normalizedCurrencies.map((currency) => currency.id));
  const fixCurrencyId = (id) => (currencyIds.has(id) ? id : fallbackCurrencyId);

  const generators = Array.isArray(source.generators) ? source.generators : [];
  const upgrades = Array.isArray(source.upgrades) ? source.upgrades : [];
  const areas = Array.isArray(source.areas) && source.areas.length ? source.areas : clone(EMPTY_MODEL.areas);

  return {
    targetTimeSeconds: positiveNonZero(source.targetTimeSeconds, 600),
    simulationMinutes: clamp(source.simulationMinutes, 1, 10080),
    ticksPerSecond: Math.round(clamp(source.ticksPerSecond, 1, 10)),
    currencies: normalizedCurrencies,
    generators: generators.map((gen, index) => ({
      id: gen.id || `gen_${index + 1}`,
      name: gen.name || `Income Source ${index + 1}`,
      currencyId: fixCurrencyId(gen.currencyId),
      baseAmount: positive(gen.baseAmount, 0),
      everySeconds: positiveNonZero(gen.everySeconds, 1),
      growthPerArea: Math.max(toNumber(gen.growthPerArea, 1), 1)
    })),
    upgrades: upgrades.map((upgrade, index) => ({
      id: upgrade.id || `upgrade_${index + 1}`,
      name: upgrade.name || `Upgrade ${index + 1}`,
      currencyId: fixCurrencyId(upgrade.currencyId),
      affectsCurrencyId: upgrade.affectsCurrencyId === "all" ? "all" : fixCurrencyId(upgrade.affectsCurrencyId),
      firstCost: positive(upgrade.firstCost, 0),
      costGrowth: Math.max(toNumber(upgrade.costGrowth, 1), 1),
      multiplierPerBuy: Math.max(toNumber(upgrade.multiplierPerBuy, 1), 1),
      maxLevel: Math.round(clamp(upgrade.maxLevel, 1, 999)),
      unlockArea: Math.round(clamp(upgrade.unlockArea, 1, 999))
    })),
    areas: areas.map((area, index) =>
      normalizeArea(
        {
          ...area,
          id: area.id || `area_${index + 1}`,
          name: area.name || `Area ${index + 1}`
        },
        fallbackCurrencyId
      )
    )
  };
}

export function currencyName(model, id) {
  if (id === "all") return "All currencies";
  return model.currencies.find((currency) => currency.id === id)?.name || id || "Currency";
}

export function formatCurrencyList(model, entries, emptyText = "None") {
  if (!Array.isArray(entries) || entries.length === 0) return emptyText;

  return entries
    .map((entry) => `${compact(entry.amount)} ${currencyName(model, entry.currencyId)}`)
    .join(" + ");
}

export function getMultiplier(model, levels, currencyId) {
  return model.upgrades.reduce((total, upgrade) => {
    if (upgrade.affectsCurrencyId !== currencyId && upgrade.affectsCurrencyId !== "all") {
      return total;
    }

    return total * Math.pow(Math.max(upgrade.multiplierPerBuy, 1), levels[upgrade.id] || 0);
  }, 1);
}

export function getIncomePerSecond(model, levels, areaIndex) {
  const income = Object.fromEntries(model.currencies.map((currency) => [currency.id, 0]));

  model.generators.forEach((gen) => {
    const areaBoost = Math.pow(gen.growthPerArea, Math.max(areaIndex, 0));
    const multiplier = getMultiplier(model, levels, gen.currencyId);
    income[gen.currencyId] =
      (income[gen.currencyId] || 0) +
      (gen.baseAmount / gen.everySeconds) * areaBoost * multiplier;
  });

  return income;
}

export function upgradeCost(upgrade, level) {
  return upgrade.firstCost * Math.pow(upgrade.costGrowth, Math.max(level, 0));
}

export function canAffordCosts(balances, costs) {
  return costs.every((cost) => (balances[cost.currencyId] || 0) + 1e-9 >= cost.amount);
}

export function payCosts(balances, costs) {
  costs.forEach((cost) => {
    balances[cost.currencyId] = (balances[cost.currencyId] || 0) - cost.amount;
  });
}

export function giveRewards(balances, rewards) {
  rewards.forEach((reward) => {
    balances[reward.currencyId] = (balances[reward.currencyId] || 0) + reward.amount;
  });
}

export function simulateEconomy(rawModel) {
  const model = normalizeModel(rawModel);
  const secondsTotal = Math.round(clamp(model.simulationMinutes * 60, 60, 604800));
  const ticksPerSecond = Math.round(clamp(model.ticksPerSecond, 1, 10));
  const dt = 1 / ticksPerSecond;

  const balances = Object.fromEntries(model.currencies.map((currency) => [currency.id, currency.startingAmount]));
  const levels = Object.fromEntries(model.upgrades.map((upgrade) => [upgrade.id, 0]));
  const unlockedAreas = new Set(model.areas[0] ? [model.areas[0].id] : []);
  const areaUnlockTimes = Object.fromEntries(model.areas.map((area, index) => [area.id, index === 0 ? 0 : null]));
  const purchaseLog = [];
  const timeline = [];

  let currentAreaIndex = 0;
  let lastTimelineSecond = -60;

  for (let step = 0; step <= secondsTotal * ticksPerSecond; step += 1) {
    const t = step * dt;
    const income = getIncomePerSecond(model, levels, currentAreaIndex);

    Object.entries(income).forEach(([currencyId, amount]) => {
      balances[currencyId] = (balances[currencyId] || 0) + amount * dt;
    });

    for (let areaIndex = 1; areaIndex < model.areas.length; areaIndex += 1) {
      const area = model.areas[areaIndex];

      if (unlockedAreas.has(area.id)) continue;

      if (canAffordCosts(balances, area.costs)) {
        payCosts(balances, area.costs);
        giveRewards(balances, area.rewards);
        unlockedAreas.add(area.id);
        areaUnlockTimes[area.id] = t;
        currentAreaIndex = Math.max(currentAreaIndex, areaIndex);
      }
    }

    const availableUpgrades = model.upgrades
      .filter((upgrade) => currentAreaIndex + 1 >= upgrade.unlockArea && (levels[upgrade.id] || 0) < upgrade.maxLevel)
      .map((upgrade) => {
        const level = levels[upgrade.id] || 0;
        const cost = upgradeCost(upgrade, level);
        const affectedCurrencyIds =
          upgrade.affectsCurrencyId === "all"
            ? model.currencies.map((currency) => currency.id)
            : [upgrade.affectsCurrencyId];

        const beforeIncome = getIncomePerSecond(model, levels, currentAreaIndex);
        const nextLevels = { ...levels, [upgrade.id]: level + 1 };
        const afterIncome = getIncomePerSecond(model, nextLevels, currentAreaIndex);

        const incomeGain = affectedCurrencyIds.reduce((sum, currencyId) => {
          return sum + Math.max((afterIncome[currencyId] || 0) - (beforeIncome[currencyId] || 0), 0);
        }, 0);

        return {
          ...upgrade,
          cost,
          roiSeconds: cost / Math.max(incomeGain, 0.000001)
        };
      })
      .sort((a, b) => a.roiSeconds - b.roiSeconds);

    for (const upgrade of availableUpgrades) {
      if ((balances[upgrade.currencyId] || 0) + 1e-9 >= upgrade.cost && upgrade.roiSeconds <= model.targetTimeSeconds * 2.5) {
        balances[upgrade.currencyId] -= upgrade.cost;
        levels[upgrade.id] = (levels[upgrade.id] || 0) + 1;

        purchaseLog.push({
          time: t,
          name: upgrade.name,
          level: levels[upgrade.id],
          cost: upgrade.cost,
          currencyId: upgrade.currencyId
        });

        break;
      }
    }

    if (t - lastTimelineSecond >= 60 || step === 0 || step === secondsTotal * ticksPerSecond) {
      lastTimelineSecond = t;

      const row = {
        minute: Math.round(t / 60),
        area: currentAreaIndex + 1
      };

      model.currencies.forEach((currency) => {
        row[currency.id] = Math.max(0, Math.round((balances[currency.id] || 0) * 100) / 100);
      });

      timeline.push(row);
    }
  }

  const finalIncome = getIncomePerSecond(model, levels, currentAreaIndex);

  const areaRows = model.areas.map((area, index) => {
    const unlockTime = areaUnlockTimes[area.id];
    const previousArea = model.areas[index - 1];
    const previousUnlockTime = index === 0 ? 0 : areaUnlockTimes[previousArea?.id];
    const segmentTime = unlockTime == null || previousUnlockTime == null ? null : unlockTime - previousUnlockTime;

    return {
      ...area,
      index: index + 1,
      unlockTime,
      segmentTime,
      unlocked: unlockTime != null
    };
  });

  return {
    model,
    balances,
    levels,
    finalIncome,
    areaRows,
    timeline,
    purchaseLog,
    currentAreaIndex
  };
}

export function getWarnings(rawModel, sim) {
  const model = normalizeModel(rawModel);
  const warnings = [];
  const target = model.targetTimeSeconds;

  if (model.generators.length === 0 && model.areas.length > 1) {
    warnings.push({
      type: "bad",
      text: "You have unlockable areas but no income sources."
    });
  }

  sim.areaRows.forEach((area, index) => {
    if (index === 0) return;

    if (!area.unlocked) {
      warnings.push({
        type: "bad",
        text: `${area.name} was not reached. A required currency may be too expensive or impossible to earn.`
      });
      return;
    }

    if (area.segmentTime > target * 2) {
      warnings.push({
        type: "bad",
        text: `${area.name} takes too long to reach: ${timeText(area.segmentTime)} after the previous area.`
      });
    }

    if (area.segmentTime < target * 0.25) {
      warnings.push({
        type: "warn",
        text: `${area.name} is reached too fast: ${timeText(area.segmentTime)} after the previous area.`
      });
    }

    const previous = sim.areaRows[index - 1];

    if (previous?.segmentTime && area.segmentTime / previous.segmentTime > 2.5) {
      warnings.push({
        type: "bad",
        text: `Difficulty spike before ${area.name}: ${Math.round(area.segmentTime / previous.segmentTime)}x slower than the previous step.`
      });
    }
  });

  model.currencies.forEach((currency) => {
    const hasGenerator = model.generators.some((gen) => gen.currencyId === currency.id && gen.baseAmount > 0);
    const hasAreaReward = model.areas.some((area) =>
      area.rewards.some((reward) => reward.currencyId === currency.id && reward.amount > 0)
    );
    const isSpent =
      model.upgrades.some((upgrade) => upgrade.currencyId === currency.id) ||
      model.areas.some((area) => area.costs.some((cost) => cost.currencyId === currency.id && cost.amount > 0));

    if (isSpent && !hasGenerator && !hasAreaReward && currency.startingAmount <= 0) {
      warnings.push({
        type: "bad",
        text: `${currency.name} is used as a cost but has no source.`
      });
    }
  });

  model.upgrades.forEach((upgrade) => {
    if (upgrade.multiplierPerBuy <= 1) {
      warnings.push({
        type: "warn",
        text: `${upgrade.name} has no real multiplier. Set multiplier per buy above 1.`
      });
    }

    if (upgrade.costGrowth > upgrade.multiplierPerBuy * 2.2) {
      warnings.push({
        type: "warn",
        text: `${upgrade.name} cost grows much faster than its multiplier. It may stop being worth buying early.`
      });
    }
  });

  if (warnings.length === 0) {
    warnings.push({
      type: "good",
      text: "No major economy problems detected in this simulation."
    });
  }

  return warnings.slice(0, 16);
}

export function suggestNextArea(rawModel, sim) {
  const model = normalizeModel(rawModel);
  const lastUnlocked = sim.areaRows.filter((area) => area.unlocked).at(-1);
  const fallbackCurrencyId = model.currencies[0]?.id || "currency_1";
  const spendCurrency = lastUnlocked?.costs?.[0]?.currencyId || fallbackCurrencyId;
  const income = Math.max(sim.finalIncome[spendCurrency] || sim.finalIncome[fallbackCurrencyId] || 1, 0.000001);

  return {
    name: `Area ${model.areas.length + 1}`,
    costs: [
      {
        currencyId: spendCurrency,
        amount: Math.max(1, income * model.targetTimeSeconds)
      }
    ],
    rewards: []
  };
}

export function runTests() {
  const model = normalizeModel(clone(EXAMPLE_MODEL));
  const tests = [];
  const emptyLevels = Object.fromEntries(model.upgrades.map((upgrade) => [upgrade.id, 0]));
  const income = getIncomePerSecond(model, emptyLevels, 0);

  tests.push({
    name: "passive Rune income uses amount / seconds",
    pass: Math.abs(income.rune - 5) < 0.0001
  });

  tests.push({
    name: "passive Essence income uses amount / seconds",
    pass: Math.abs(income.essence - 0.2) < 0.0001
  });

  tests.push({
    name: "multi-cost areas are supported",
    pass: model.areas[2].costs.length === 2
  });

  tests.push({
    name: "multi-reward areas are supported",
    pass: model.areas[2].rewards.length === 2
  });

  const sim = simulateEconomy(model);

  tests.push({
    name: "simulation creates timeline",
    pass: sim.timeline.length > 1
  });

  tests.push({
    name: "simulation returns finite income",
    pass: Object.values(sim.finalIncome).every(Number.isFinite)
  });

  tests.push({
    name: "suggested next area has costs array",
    pass: Array.isArray(suggestNextArea(model, sim).costs)
  });

  tests.push({
    name: "compact formats thousands",
    pass: compact(1500) === "1.50K"
  });

  return tests;
}