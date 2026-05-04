import { EMPTY_MODEL, EXAMPLE_MODEL } from "./data.js";

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function positive(value, fallback = 0) {
  return Math.max(num(value, fallback), 0);
}

export function atLeast(value, minimum) {
  return Math.max(num(value, minimum), minimum);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, num(value, min)));
}

export function makeId(prefix, list) {
  let index = list.length + 1;
  let id = `${prefix}_${index}`;
  const used = new Set(list.map((item) => item.id));

  while (used.has(id)) {
    index += 1;
    id = `${prefix}_${index}`;
  }

  return id;
}

export function updateAt(list, index, patch) {
  return list.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    return { ...item, ...patch };
  });
}

export function removeAt(list, index) {
  return list.filter((_, itemIndex) => itemIndex !== index);
}

export function compact(value) {
  const n = num(value, 0);
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
  const n = num(seconds, NaN);

  if (!Number.isFinite(n)) return "—";
  if (n < 60) return `${n.toFixed(0)}s`;
  if (n < 3600) return `${(n / 60).toFixed(1)}m`;
  if (n < 86400) return `${(n / 3600).toFixed(1)}h`;

  return `${(n / 86400).toFixed(1)}d`;
}

export function normalizeModel(rawModel) {
  const source = rawModel || EMPTY_MODEL;

  const currencies =
    Array.isArray(source.currencies) && source.currencies.length > 0
      ? source.currencies
      : clone(EMPTY_MODEL.currencies);

  const cleanCurrencies = currencies.map((currency, index) => ({
    id: currency.id || `currency_${index + 1}`,
    name: currency.name || `Currency ${index + 1}`,
    start: positive(currency.start, 0)
  }));

  const fallbackCurrencyId = cleanCurrencies[0].id;
  const currencyIds = new Set(cleanCurrencies.map((currency) => currency.id));
  const fixCurrency = (id) => (currencyIds.has(id) ? id : fallbackCurrencyId);

  const sources = Array.isArray(source.sources) ? source.sources : [];
  const upgrades = Array.isArray(source.upgrades) ? source.upgrades : [];
  const areas = Array.isArray(source.areas) && source.areas.length > 0 ? source.areas : clone(EMPTY_MODEL.areas);

  return {
    targetSeconds: atLeast(source.targetSeconds, 1),
    simulationMinutes: clamp(source.simulationMinutes, 1, 10080),
    currencies: cleanCurrencies,
    sources: sources.map((incomeSource, index) => ({
      id: incomeSource.id || `source_${index + 1}`,
      name: incomeSource.name || `Income Source ${index + 1}`,
      currencyId: fixCurrency(incomeSource.currencyId),
      amount: positive(incomeSource.amount, 0),
      everySeconds: atLeast(incomeSource.everySeconds, 0.000001),
      areaGrowth: atLeast(incomeSource.areaGrowth, 1)
    })),
    upgrades: upgrades.map((upgrade, index) => ({
      id: upgrade.id || `upgrade_${index + 1}`,
      name: upgrade.name || `Upgrade ${index + 1}`,
      costCurrencyId: fixCurrency(upgrade.costCurrencyId),
      affectedCurrencyId: upgrade.affectedCurrencyId === "all" ? "all" : fixCurrency(upgrade.affectedCurrencyId),
      firstCost: positive(upgrade.firstCost, 0),
      costGrowth: atLeast(upgrade.costGrowth, 1),
      multiplier: atLeast(upgrade.multiplier, 1),
      maxLevel: Math.round(clamp(upgrade.maxLevel, 1, 999)),
      unlockArea: Math.round(clamp(upgrade.unlockArea, 1, 999))
    })),
    areas: areas.map((area, index) => ({
      id: area.id || `area_${index + 1}`,
      name: area.name || `Area ${index + 1}`,
      costs: Array.isArray(area.costs)
        ? area.costs.map((cost) => ({
            currencyId: fixCurrency(cost.currencyId),
            amount: positive(cost.amount, 0)
          }))
        : [],
      rewards: Array.isArray(area.rewards)
        ? area.rewards.map((reward) => ({
            currencyId: fixCurrency(reward.currencyId),
            amount: positive(reward.amount, 0)
          }))
        : []
    }))
  };
}

export function currencyName(model, id) {
  if (id === "all") return "All";
  return model.currencies.find((currency) => currency.id === id)?.name || id || "Currency";
}

export function formatCurrencyList(model, entries, emptyText = "None") {
  if (!entries || entries.length === 0) return emptyText;

  return entries
    .map((entry) => `${compact(entry.amount)} ${currencyName(model, entry.currencyId)}`)
    .join(" + ");
}

export function getMultiplier(model, levels, currencyId) {
  return model.upgrades.reduce((total, upgrade) => {
    if (upgrade.affectedCurrencyId !== "all" && upgrade.affectedCurrencyId !== currencyId) {
      return total;
    }

    const level = levels[upgrade.id] || 0;
    return total * Math.pow(upgrade.multiplier, level);
  }, 1);
}

export function getIncomePerSecond(model, levels, areaIndex) {
  const income = Object.fromEntries(model.currencies.map((currency) => [currency.id, 0]));

  model.sources.forEach((source) => {
    const baseIncome = source.amount / source.everySeconds;
    const areaBoost = Math.pow(source.areaGrowth, Math.max(areaIndex, 0));
    const multiplier = getMultiplier(model, levels, source.currencyId);

    income[source.currencyId] += baseIncome * areaBoost * multiplier;
  });

  return income;
}

export function upgradeCost(upgrade, level) {
  return upgrade.firstCost * Math.pow(upgrade.costGrowth, level);
}

export function canAfford(balances, costs) {
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
  const secondsTotal = Math.round(model.simulationMinutes * 60);

  const balances = Object.fromEntries(model.currencies.map((currency) => [currency.id, currency.start]));
  const levels = Object.fromEntries(model.upgrades.map((upgrade) => [upgrade.id, 0]));
  const unlockTimes = Object.fromEntries(model.areas.map((area, index) => [area.id, index === 0 ? 0 : null]));
  const unlocked = new Set(model.areas[0] ? [model.areas[0].id] : []);
  const purchases = [];
  const timeline = [];

  let currentAreaIndex = 0;

  for (let second = 0; second <= secondsTotal; second += 1) {
    const income = getIncomePerSecond(model, levels, currentAreaIndex);

    Object.entries(income).forEach(([currencyId, amount]) => {
      balances[currencyId] = (balances[currencyId] || 0) + amount;
    });

    for (let areaIndex = 1; areaIndex < model.areas.length; areaIndex += 1) {
      const area = model.areas[areaIndex];

      if (unlocked.has(area.id)) continue;

      if (canAfford(balances, area.costs)) {
        payCosts(balances, area.costs);
        giveRewards(balances, area.rewards);
        unlocked.add(area.id);
        unlockTimes[area.id] = second;
        currentAreaIndex = Math.max(currentAreaIndex, areaIndex);
      }
    }

    const options = model.upgrades
      .filter((upgrade) => currentAreaIndex + 1 >= upgrade.unlockArea)
      .filter((upgrade) => (levels[upgrade.id] || 0) < upgrade.maxLevel)
      .map((upgrade) => {
        const level = levels[upgrade.id] || 0;
        const cost = upgradeCost(upgrade, level);
        const affectedIds =
          upgrade.affectedCurrencyId === "all"
            ? model.currencies.map((currency) => currency.id)
            : [upgrade.affectedCurrencyId];

        const before = getIncomePerSecond(model, levels, currentAreaIndex);
        const nextLevels = { ...levels, [upgrade.id]: level + 1 };
        const after = getIncomePerSecond(model, nextLevels, currentAreaIndex);

        const gain = affectedIds.reduce((sum, id) => {
          return sum + Math.max((after[id] || 0) - (before[id] || 0), 0);
        }, 0);

        return {
          upgrade,
          cost,
          roi: cost / Math.max(gain, 0.000001)
        };
      })
      .sort((a, b) => a.roi - b.roi);

    for (const option of options) {
      if ((balances[option.upgrade.costCurrencyId] || 0) >= option.cost && option.roi <= model.targetSeconds * 2.5) {
        balances[option.upgrade.costCurrencyId] -= option.cost;
        levels[option.upgrade.id] = (levels[option.upgrade.id] || 0) + 1;

        purchases.push({
          second,
          upgradeId: option.upgrade.id,
          name: option.upgrade.name,
          level: levels[option.upgrade.id]
        });

        break;
      }
    }

    if (second % 60 === 0 || second === secondsTotal) {
      const row = {
        minute: Math.round(second / 60),
        area: currentAreaIndex + 1
      };

      model.currencies.forEach((currency) => {
        row[currency.id] = Math.max(0, balances[currency.id] || 0);
      });

      timeline.push(row);
    }
  }

  const finalIncome = getIncomePerSecond(model, levels, currentAreaIndex);

  const areaRows = model.areas.map((area, index) => {
    const unlockTime = unlockTimes[area.id];
    const previous = model.areas[index - 1];
    const previousTime = index === 0 ? 0 : unlockTimes[previous.id];
    const segmentTime = unlockTime == null || previousTime == null ? null : unlockTime - previousTime;

    return {
      ...area,
      index: index + 1,
      unlocked: unlockTime != null,
      unlockTime,
      segmentTime
    };
  });

  return {
    model,
    balances,
    levels,
    purchases,
    timeline,
    areaRows,
    finalIncome,
    currentAreaIndex
  };
}

export function getWarnings(rawModel, simulation) {
  const model = normalizeModel(rawModel);
  const warnings = [];

  if (model.areas.length > 1 && model.sources.length === 0) {
    warnings.push({
      type: "bad",
      text: "You have unlockable areas but no income sources."
    });
  }

  simulation.areaRows.forEach((area, index) => {
    if (index === 0) return;

    if (!area.unlocked) {
      warnings.push({
        type: "bad",
        text: `${area.name} was not reached. A cost currency may be impossible or too slow to earn.`
      });
      return;
    }

    if (area.segmentTime > model.targetSeconds * 2) {
      warnings.push({
        type: "bad",
        text: `${area.name} is too slow: ${timeText(area.segmentTime)} from previous area.`
      });
    }

    if (area.segmentTime < model.targetSeconds * 0.25) {
      warnings.push({
        type: "warn",
        text: `${area.name} is too fast: ${timeText(area.segmentTime)} from previous area.`
      });
    }
  });

  model.currencies.forEach((currency) => {
    const hasSource = model.sources.some((source) => source.currencyId === currency.id && source.amount > 0);
    const hasReward = model.areas.some((area) =>
      area.rewards.some((reward) => reward.currencyId === currency.id && reward.amount > 0)
    );
    const isCost =
      model.areas.some((area) => area.costs.some((cost) => cost.currencyId === currency.id && cost.amount > 0)) ||
      model.upgrades.some((upgrade) => upgrade.costCurrencyId === currency.id);

    if (isCost && !hasSource && !hasReward && currency.start <= 0) {
      warnings.push({
        type: "bad",
        text: `${currency.name} is used as a cost but has no source.`
      });
    }
  });

  model.upgrades.forEach((upgrade) => {
    if (upgrade.multiplier <= 1) {
      warnings.push({
        type: "warn",
        text: `${upgrade.name} has no multiplier gain.`
      });
    }

    if (upgrade.costGrowth > upgrade.multiplier * 2.3) {
      warnings.push({
        type: "warn",
        text: `${upgrade.name} cost grows much faster than its multiplier.`
      });
    }
  });

  if (warnings.length === 0) {
    warnings.push({
      type: "good",
      text: "No major problems found."
    });
  }

  return warnings.slice(0, 16);
}

export function suggestNextArea(rawModel, simulation) {
  const model = normalizeModel(rawModel);
  const mainCurrencyId = model.currencies[0]?.id || "currency_1";
  const income = Math.max(simulation.finalIncome[mainCurrencyId] || 1, 1);

  return {
    name: `Area ${model.areas.length + 1}`,
    costs: [
      {
        currencyId: mainCurrencyId,
        amount: Math.round(income * model.targetSeconds)
      }
    ],
    rewards: []
  };
}

export function runTests() {
  const model = normalizeModel(EXAMPLE_MODEL);
  const sim = simulateEconomy(model);

  return [
    {
      name: "Example has 3 currencies",
      pass: model.currencies.length === 3
    },
    {
      name: "Multi-cost areas work",
      pass: model.areas[2].costs.length === 2
    },
    {
      name: "Multi-reward areas work",
      pass: model.areas[2].rewards.length === 2
    },
    {
      name: "Simulation creates timeline",
      pass: sim.timeline.length > 1
    },
    {
      name: "Final income is finite",
      pass: Object.values(sim.finalIncome).every(Number.isFinite)
    },
    {
      name: "Suggested area has cost",
      pass: suggestNextArea(model, sim).costs.length === 1
    }
  ];
}