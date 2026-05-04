import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { motion } from "framer-motion";
import { EMPTY_MODEL, EXAMPLE_MODEL } from "./balancerData";
import {
  clone,
  compact,
  timeText,
  normalizeModel,
  simulateEconomy,
  getWarnings,
  suggestNextArea,
  runTests,
  makeId,
  positive,
  positiveNonZero,
  clamp,
  toNumber,
  updateArrayItem,
  currencyName,
  formatCurrencyList
} from "./balancerLogic";
import {
  Icon,
  NumberField,
  TextField,
  CurrencySelect,
  CurrencyAmountRows
} from "./balancerUi";

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border shadow-xl ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function Button({ children, className = "", ...props }) {
  return (
    <button className={`rounded-xl px-4 py-2 font-bold transition ${className}`} {...props}>
      {children}
    </button>
  );
}

function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 text-sm font-bold ${className}`}>
      {children}
    </span>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-bold ${
        active ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function IncrementalGameBalancer() {
  const [model, setModel] = useState(() => clone(EMPTY_MODEL));
  const [showTests, setShowTests] = useState(false);
  const [tab, setTab] = useState("global");

  const normalizedModel = useMemo(() => normalizeModel(model), [model]);
  const sim = useMemo(() => simulateEconomy(normalizedModel), [normalizedModel]);
  const warnings = useMemo(() => getWarnings(normalizedModel, sim), [normalizedModel, sim]);
  const next = useMemo(() => suggestNextArea(normalizedModel, sim), [normalizedModel, sim]);
  const tests = useMemo(() => runTests(), []);
  const testsPassed = tests.every((test) => test.pass);

  const reachedAreas = sim.areaRows.filter((area) => area.unlocked).length;
  const reachedSegments = sim.areaRows.filter((area) => area.segmentTime != null && area.index > 1);

  const avgSegment = reachedSegments.length
    ? reachedSegments.reduce((sum, area) => sum + area.segmentTime, 0) / reachedSegments.length
    : null;

  const balanceDiff =
    avgSegment == null
      ? null
      : Math.abs(avgSegment - normalizedModel.targetTimeSeconds) / normalizedModel.targetTimeSeconds;

  const grade =
    balanceDiff == null
      ? "Not enough data"
      : balanceDiff < 0.25
      ? "Great"
      : balanceDiff < 0.65
      ? "Good"
      : balanceDiff < 1.2
      ? "Needs work"
      : "Unbalanced";

  const chartCurrency = normalizedModel.currencies[0]?.id || "currency_1";

  const incomeChart = normalizedModel.currencies.map((currency) => ({
    name: currency.name,
    income: Number((sim.finalIncome[currency.id] || 0).toFixed(2))
  }));

  const setGlobal = (key, value) => {
    setModel((current) => ({ ...current, [key]: value }));
  };

  const setCurrency = (index, patch) => {
    setModel((current) => ({
      ...current,
      currencies: updateArrayItem(normalizeModel(current).currencies, index, patch)
    }));
  };

  const setGenerator = (index, patch) => {
    setModel((current) => ({
      ...current,
      generators: updateArrayItem(normalizeModel(current).generators, index, patch)
    }));
  };

  const setUpgrade = (index, patch) => {
    setModel((current) => ({
      ...current,
      upgrades: updateArrayItem(normalizeModel(current).upgrades, index, patch)
    }));
  };

  const setArea = (index, patch) => {
    setModel((current) => ({
      ...current,
      areas: updateArrayItem(normalizeModel(current).areas, index, patch)
    }));
  };

  function addCurrency() {
    setModel((current) => {
      const normalized = normalizeModel(current);
      const id = makeId("currency", normalized.currencies);

      return {
        ...normalized,
        currencies: [
          ...normalized.currencies,
          {
            id,
            name: `Currency ${normalized.currencies.length + 1}`,
            startingAmount: 0
          }
        ]
      };
    });
  }

  function addGenerator() {
    setModel((current) => {
      const normalized = normalizeModel(current);

      return {
        ...normalized,
        generators: [
          ...normalized.generators,
          {
            id: makeId("gen", normalized.generators),
            name: `Income Source ${normalized.generators.length + 1}`,
            currencyId: normalized.currencies[0].id,
            baseAmount: 1,
            everySeconds: 1,
            growthPerArea: 1
          }
        ]
      };
    });
  }

  function addUpgrade() {
    setModel((current) => {
      const normalized = normalizeModel(current);

      return {
        ...normalized,
        upgrades: [
          ...normalized.upgrades,
          {
            id: makeId("upgrade", normalized.upgrades),
            name: `Upgrade ${normalized.upgrades.length + 1}`,
            currencyId: normalized.currencies[0].id,
            affectsCurrencyId: normalized.currencies[0].id,
            firstCost: 100,
            costGrowth: 2,
            multiplierPerBuy: 1.5,
            maxLevel: 10,
            unlockArea: 1
          }
        ]
      };
    });
  }

  function addBlankArea() {
    setModel((current) => {
      const normalized = normalizeModel(current);

      return {
        ...normalized,
        areas: [
          ...normalized.areas,
          {
            id: makeId("area", normalized.areas),
            name: `Area ${normalized.areas.length + 1}`,
            costs: [],
            rewards: []
          }
        ]
      };
    });
  }

  function addSuggestedArea() {
    setModel((current) => {
      const normalized = normalizeModel(current);

      return {
        ...normalized,
        areas: [
          ...normalized.areas,
          {
            id: makeId("area", normalized.areas),
            name: next.name,
            costs: next.costs.map((cost) => ({
              ...cost,
              amount: Math.round(cost.amount)
            })),
            rewards: []
          }
        ]
      };
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Icon name="app" className="w-7 h-7" />
              <Badge className="rounded-full bg-indigo-600 text-white">
                Clean Modular Builder
              </Badge>
              <Badge
                className={
                  testsPassed
                    ? "rounded-full border border-emerald-400 text-emerald-200"
                    : "rounded-full border border-red-400 text-red-200"
                }
              >
                Tests {testsPassed ? "passed" : "failed"}
              </Badge>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Incremental Economy Simulator
            </h1>

            <p className="text-slate-200 mt-2 max-w-3xl">
              Starts clean. Each area can require many currencies and give many rewards.
            </p>
          </div>

          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4 grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-300">Balance</p>
                <p className="text-2xl font-black text-white">{grade}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-300">Areas reached</p>
                <p className="text-2xl font-black text-white">
                  {reachedAreas}/{normalizedModel.areas.length}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-300">Avg step</p>
                <p className="text-2xl font-black text-white">
                  {avgSegment == null ? "—" : timeText(avgSegment)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-4 bg-slate-900 border-slate-700">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Icon name="economy" />
                <h2 className="text-xl font-black text-white">Model Builder</h2>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <TabButton active={tab === "global"} onClick={() => setTab("global")}>
                  Main
                </TabButton>
                <TabButton active={tab === "currencies"} onClick={() => setTab("currencies")}>
                  Money
                </TabButton>
                <TabButton active={tab === "sources"} onClick={() => setTab("sources")}>
                  Sources
                </TabButton>
                <TabButton active={tab === "upgrades"} onClick={() => setTab("upgrades")}>
                  Ups
                </TabButton>
                <TabButton active={tab === "areas"} onClick={() => setTab("areas")}>
                  Areas
                </TabButton>
              </div>

              {tab === "global" && (
                <div className="space-y-4">
                  <NumberField
                    label="Target time per unlock"
                    value={normalizedModel.targetTimeSeconds / 60}
                    setValue={(value) => setGlobal("targetTimeSeconds", positiveNonZero(value, 0.1) * 60)}
                    suffix="min"
                    step={0.5}
                  />

                  <NumberField
                    label="Simulation length"
                    value={normalizedModel.simulationMinutes}
                    setValue={(value) => setGlobal("simulationMinutes", clamp(value, 1, 10080))}
                    suffix="min"
                  />

                  <NumberField
                    label="Simulation ticks per second"
                    value={normalizedModel.ticksPerSecond}
                    setValue={(value) => setGlobal("ticksPerSecond", Math.round(clamp(value, 1, 10)))}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      className="bg-slate-700 hover:bg-slate-600 text-white"
                      onClick={() => setModel(clone(EMPTY_MODEL))}
                    >
                      Clean
                    </Button>

                    <Button
                      className="bg-indigo-600 hover:bg-indigo-500 text-white"
                      onClick={() => setModel(clone(EXAMPLE_MODEL))}
                    >
                      Example
                    </Button>

                    <Button
                      className="border border-slate-500 text-white hover:bg-slate-800"
                      onClick={() => setShowTests((value) => !value)}
                    >
                      {showTests ? "Hide" : "Tests"}
                    </Button>
                  </div>

                  {showTests && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3 space-y-2">
                      <p className="text-sm font-black text-white">Built-in formula tests</p>

                      {tests.map((test) => (
                        <div key={test.name} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-slate-200">{test.name}</span>
                          <span className={test.pass ? "text-emerald-200 font-black" : "text-red-200 font-black"}>
                            {test.pass ? "PASS" : "FAIL"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "currencies" && (
                <div className="space-y-4">
                  {normalizedModel.currencies.map((currency, index) => (
                    <div key={currency.id} className="rounded-2xl bg-slate-800 border border-slate-700 p-3 space-y-3">
                      <TextField
                        label="Currency name"
                        value={currency.name}
                        setValue={(name) => setCurrency(index, { name })}
                      />
                      <NumberField
                        label="Starting amount"
                        value={currency.startingAmount}
                        setValue={(startingAmount) => setCurrency(index, { startingAmount: positive(startingAmount, 0) })}
                      />
                    </div>
                  ))}

                  <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" onClick={addCurrency}>
                    Add Currency
                  </Button>
                </div>
              )}

              {tab === "sources" && (
                <div className="space-y-4">
                  {normalizedModel.generators.map((gen, index) => (
                    <div key={gen.id} className="rounded-2xl bg-slate-800 border border-slate-700 p-3 space-y-3">
                      <TextField
                        label="Source name"
                        value={gen.name}
                        setValue={(name) => setGenerator(index, { name })}
                      />

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-200">Produces</label>
                        <CurrencySelect
                          model={normalizedModel}
                          value={gen.currencyId}
                          onChange={(currencyId) => setGenerator(index, { currencyId })}
                        />
                      </div>

                      <NumberField
                        label="Amount earned"
                        value={gen.baseAmount}
                        setValue={(baseAmount) => setGenerator(index, { baseAmount: positive(baseAmount, 0) })}
                      />

                      <NumberField
                        label="Every X seconds"
                        value={gen.everySeconds}
                        setValue={(everySeconds) => setGenerator(index, { everySeconds: positiveNonZero(everySeconds, 1) })}
                        step={0.5}
                      />

                      <NumberField
                        label="Area growth multiplier"
                        value={gen.growthPerArea}
                        setValue={(growthPerArea) => setGenerator(index, { growthPerArea: Math.max(toNumber(growthPerArea, 1), 1) })}
                        step={0.05}
                      />
                    </div>
                  ))}

                  <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" onClick={addGenerator}>
                    Add Income Source
                  </Button>
                </div>
              )}

              {tab === "upgrades" && (
                <div className="space-y-4">
                  {normalizedModel.upgrades.length === 0 && (
                    <p className="text-sm text-slate-200 rounded-xl bg-slate-800 border border-slate-700 p-3">
                      No upgrades yet.
                    </p>
                  )}

                  {normalizedModel.upgrades.map((upgrade, index) => (
                    <div key={upgrade.id} className="rounded-2xl bg-slate-800 border border-slate-700 p-3 space-y-3">
                      <TextField
                        label="Upgrade name"
                        value={upgrade.name}
                        setValue={(name) => setUpgrade(index, { name })}
                      />

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-200">Costs currency</label>
                        <CurrencySelect
                          model={normalizedModel}
                          value={upgrade.currencyId}
                          onChange={(currencyId) => setUpgrade(index, { currencyId })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-200">Multiplies</label>
                        <CurrencySelect
                          model={normalizedModel}
                          value={upgrade.affectsCurrencyId}
                          onChange={(affectsCurrencyId) => setUpgrade(index, { affectsCurrencyId })}
                          includeAll
                        />
                      </div>

                      <NumberField
                        label="First cost"
                        value={upgrade.firstCost}
                        setValue={(firstCost) => setUpgrade(index, { firstCost: positive(firstCost, 0) })}
                      />

                      <NumberField
                        label="Cost growth"
                        value={upgrade.costGrowth}
                        setValue={(costGrowth) => setUpgrade(index, { costGrowth: Math.max(toNumber(costGrowth, 1), 1) })}
                        step={0.05}
                      />

                      <NumberField
                        label="Multiplier per buy"
                        value={upgrade.multiplierPerBuy}
                        setValue={(multiplierPerBuy) => setUpgrade(index, { multiplierPerBuy: Math.max(toNumber(multiplierPerBuy, 1), 1) })}
                        step={0.05}
                      />

                      <NumberField
                        label="Max level"
                        value={upgrade.maxLevel}
                        setValue={(maxLevel) => setUpgrade(index, { maxLevel: Math.round(clamp(maxLevel, 1, 999)) })}
                      />

                      <NumberField
                        label="Unlocks at area"
                        value={upgrade.unlockArea}
                        setValue={(unlockArea) => setUpgrade(index, { unlockArea: Math.round(clamp(unlockArea, 1, 999)) })}
                      />
                    </div>
                  ))}

                  <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" onClick={addUpgrade}>
                    Add Upgrade
                  </Button>
                </div>
              )}

              {tab === "areas" && (
                <div className="space-y-4">
                  {normalizedModel.areas.map((area, index) => (
                    <div key={area.id} className="rounded-2xl bg-slate-800 border border-slate-700 p-3 space-y-4">
                      <TextField
                        label="Area name"
                        value={area.name}
                        setValue={(name) => setArea(index, { name })}
                      />

                      <CurrencyAmountRows
                        title="Costs required to unlock this area"
                        model={normalizedModel}
                        entries={area.costs}
                        addLabel="Add Cost"
                        emptyText="Free"
                        onChange={(costs) => setArea(index, { costs })}
                      />

                      <CurrencyAmountRows
                        title="Rewards given when unlocked"
                        model={normalizedModel}
                        entries={area.rewards}
                        addLabel="Add Reward"
                        emptyText="None"
                        onChange={(rewards) => setArea(index, { rewards })}
                      />
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-3">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" onClick={addBlankArea}>
                      Add Blank Area
                    </Button>

                    <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white" onClick={addSuggestedArea}>
                      Add Suggested
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-slate-300">Main balance</p>
                  <p className="text-2xl font-black text-white">{compact(sim.balances[chartCurrency] || 0)}</p>
                  <p className="text-sm text-slate-200">Final {normalizedModel.currencies[0]?.name}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-slate-300">Income / second</p>
                  <p className="text-2xl font-black text-white">{compact(sim.finalIncome[chartCurrency] || 0)}</p>
                  <p className="text-sm text-slate-200">Final rate</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-slate-300">Purchases made</p>
                  <p className="text-2xl font-black text-white">{sim.purchaseLog.length}</p>
                  <p className="text-sm text-slate-200">Auto-bought efficient upgrades</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="chart" />
                  <h2 className="text-xl font-black text-white">Main Currency Over Time</h2>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sim.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="minute" stroke="#e2e8f0" />
                      <YAxis stroke="#e2e8f0" />
                      <Tooltip
                        contentStyle={{ background: "#0f172a", border: "1px solid #475569", color: "#fff" }}
                        formatter={(value) => compact(value)}
                        labelFormatter={(value) => `Minute ${value}`}
                      />
                      <Line type="monotone" dataKey={chartCurrency} stroke="#a5b4fc" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="warning" />
                    <h2 className="text-xl font-black text-white">Balance Warnings</h2>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-auto pr-1">
                    {warnings.map((warning, index) => (
                      <div
                        key={`${warning.text}_${index}`}
                        className={`p-3 rounded-xl text-sm font-semibold ${
                          warning.type === "bad"
                            ? "bg-red-900 text-red-50 border border-red-400"
                            : warning.type === "good"
                            ? "bg-emerald-900 text-emerald-50 border border-emerald-400"
                            : "bg-amber-900 text-amber-50 border border-amber-400"
                        }`}
                      >
                        {warning.text}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Icon name="area" />
                    <h2 className="text-xl font-black text-white">Suggested Next Area</h2>
                  </div>

                  <p className="text-sm text-slate-200">
                    Uses your final income and target unlock time.
                  </p>

                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <p className="text-xs font-bold text-slate-300">Suggested cost</p>
                    <p className="text-xl font-black text-white">
                      {formatCurrencyList(normalizedModel, next.costs, "Free")}
                    </p>
                  </div>

                  <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" onClick={addSuggestedArea}>
                    Add Suggested Area
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="area" />
              <h2 className="text-xl font-black text-white">Area Progression</h2>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm text-white">
                <thead className="text-slate-200 border-b border-slate-700">
                  <tr>
                    <th className="text-left py-2">Area</th>
                    <th className="text-left py-2">Costs</th>
                    <th className="text-left py-2">Rewards</th>
                    <th className="text-right py-2">Reached At</th>
                    <th className="text-right py-2">Time From Previous</th>
                  </tr>
                </thead>

                <tbody>
                  {sim.areaRows.map((area) => (
                    <tr key={area.id} className="border-b border-slate-800 hover:bg-slate-800/70">
                      <td className="py-2 font-bold text-white">{area.name}</td>
                      <td className="py-2 text-slate-100">
                        {formatCurrencyList(normalizedModel, area.costs, "Free")}
                      </td>
                      <td className="py-2 text-slate-100">
                        {formatCurrencyList(normalizedModel, area.rewards, "None")}
                      </td>
                      <td className="text-right py-2 text-slate-100">
                        {area.unlockTime == null ? "Not reached" : timeText(area.unlockTime)}
                      </td>
                      <td className="text-right py-2 font-black text-white">
                        {area.segmentTime == null ? "—" : timeText(area.segmentTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-5">
              <h2 className="text-xl font-black text-white mb-4">Final Income / Second</h2>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#e2e8f0" />
                    <YAxis stroke="#e2e8f0" />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #475569", color: "#fff" }}
                      formatter={(value) => compact(value)}
                    />
                    <Bar dataKey="income" fill="#818cf8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="upgrade" />
                <h2 className="text-xl font-black text-white">Upgrade Levels Reached</h2>
              </div>

              {normalizedModel.upgrades.length === 0 ? (
                <p className="text-sm text-slate-200 rounded-xl bg-slate-800 border border-slate-700 p-3">
                  No upgrades yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {normalizedModel.upgrades.map((upgrade) => (
                    <div
                      key={upgrade.id}
                      className="rounded-xl bg-slate-800 border border-slate-700 p-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-black text-white">{upgrade.name}</p>
                        <p className="text-xs text-slate-200">
                          Costs {currencyName(normalizedModel, upgrade.currencyId)} · Multiplies{" "}
                          {currencyName(normalizedModel, upgrade.affectsCurrencyId)}
                        </p>
                      </div>

                      <p className="text-xl font-black text-white shrink-0">
                        {sim.levels[upgrade.id] || 0}/{upgrade.maxLevel}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}