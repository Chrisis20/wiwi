import React, { useMemo, useState } from "react";
import { EMPTY_MODEL, EXAMPLE_MODEL } from "./data.js";
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
  atLeast,
  clamp,
  updateAt,
  removeAt,
  currencyName,
  formatCurrencyList
} from "./logic.js";

function NumberInput({ label, value, onChange, min = 0, step = 1, suffix = "" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="inputRow">
        <input
          type="number"
          min={min}
          step={step}
          value={Number.isFinite(Number(value)) ? value : ""}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <b>{suffix}</b>}
      </div>
    </label>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CurrencySelect({ model, value, onChange, includeAll = false }) {
  const fallback = model.currencies[0]?.id || "currency_1";
  const validValue =
    value === "all" && includeAll
      ? "all"
      : model.currencies.some((currency) => currency.id === value)
      ? value
      : fallback;

  return (
    <select value={validValue} onChange={(event) => onChange(event.target.value)}>
      {includeAll && <option value="all">All currencies</option>}
      {model.currencies.map((currency) => (
        <option key={currency.id} value={currency.id}>
          {currency.name}
        </option>
      ))}
    </select>
  );
}

function CurrencyRows({ title, model, entries, onChange, emptyText }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const fallback = model.currencies[0]?.id || "currency_1";

  function addEntry() {
    onChange([
      ...safeEntries,
      {
        currencyId: fallback,
        amount: 0
      }
    ]);
  }

  function updateEntry(index, patch) {
    onChange(updateAt(safeEntries, index, patch));
  }

  function removeEntry(index) {
    onChange(removeAt(safeEntries, index));
  }

  return (
    <div className="miniSection">
      <div className="miniHeader">
        <h4>{title}</h4>
        <button type="button" onClick={addEntry}>
          Add
        </button>
      </div>

      {safeEntries.length === 0 && <p className="mutedBox">{emptyText}</p>}

      {safeEntries.map((entry, index) => (
        <div className="currencyRow" key={`${entry.currencyId}_${index}`}>
          <CurrencySelect
            model={model}
            value={entry.currencyId}
            onChange={(currencyId) => updateEntry(index, { currencyId })}
          />

          <input
            type="number"
            min="0"
            value={Number.isFinite(Number(entry.amount)) ? entry.amount : ""}
            onChange={(event) => updateEntry(index, { amount: positive(event.target.value, 0) })}
          />

          <button type="button" className="dangerButton" onClick={() => removeEntry(index)}>
            -
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [model, setModel] = useState(() => clone(EMPTY_MODEL));
  const [tab, setTab] = useState("main");
  const [showTests, setShowTests] = useState(false);

  const normalized = useMemo(() => normalizeModel(model), [model]);
  const simulation = useMemo(() => simulateEconomy(normalized), [normalized]);
  const warnings = useMemo(() => getWarnings(normalized, simulation), [normalized, simulation]);
  const nextArea = useMemo(() => suggestNextArea(normalized, simulation), [normalized, simulation]);
  const tests = useMemo(() => runTests(), []);
  const testsPassed = tests.every((test) => test.pass);

  const mainCurrency = normalized.currencies[0]?.id || "currency_1";
  const reachedAreas = simulation.areaRows.filter((area) => area.unlocked).length;
  const reachedSegments = simulation.areaRows.filter((area) => area.index > 1 && area.segmentTime != null);

  const averageStep =
    reachedSegments.length > 0
      ? reachedSegments.reduce((sum, area) => sum + area.segmentTime, 0) / reachedSegments.length
      : null;

  const balanceGrade =
    averageStep == null
      ? "Not enough data"
      : Math.abs(averageStep - normalized.targetSeconds) / normalized.targetSeconds < 0.25
      ? "Great"
      : Math.abs(averageStep - normalized.targetSeconds) / normalized.targetSeconds < 0.65
      ? "Good"
      : Math.abs(averageStep - normalized.targetSeconds) / normalized.targetSeconds < 1.2
      ? "Needs work"
      : "Unbalanced";

  function setGlobal(key, value) {
    setModel((current) => ({
      ...current,
      [key]: value
    }));
  }

  function setCurrency(index, patch) {
    setModel((current) => {
      const clean = normalizeModel(current);
      return {
        ...clean,
        currencies: updateAt(clean.currencies, index, patch)
      };
    });
  }

  function setSource(index, patch) {
    setModel((current) => {
      const clean = normalizeModel(current);
      return {
        ...clean,
        sources: updateAt(clean.sources, index, patch)
      };
    });
  }

  function setUpgrade(index, patch) {
    setModel((current) => {
      const clean = normalizeModel(current);
      return {
        ...clean,
        upgrades: updateAt(clean.upgrades, index, patch)
      };
    });
  }

  function setArea(index, patch) {
    setModel((current) => {
      const clean = normalizeModel(current);
      return {
        ...clean,
        areas: updateAt(clean.areas, index, patch)
      };
    });
  }

  function addCurrency() {
    setModel((current) => {
      const clean = normalizeModel(current);
      const id = makeId("currency", clean.currencies);

      return {
        ...clean,
        currencies: [
          ...clean.currencies,
          {
            id,
            name: `Currency ${clean.currencies.length + 1}`,
            start: 0
          }
        ]
      };
    });
  }

  function addSource() {
    setModel((current) => {
      const clean = normalizeModel(current);

      return {
        ...clean,
        sources: [
          ...clean.sources,
          {
            id: makeId("source", clean.sources),
            name: `Income Source ${clean.sources.length + 1}`,
            currencyId: clean.currencies[0].id,
            amount: 1,
            everySeconds: 1,
            areaGrowth: 1
          }
        ]
      };
    });
  }

  function addUpgrade() {
    setModel((current) => {
      const clean = normalizeModel(current);

      return {
        ...clean,
        upgrades: [
          ...clean.upgrades,
          {
            id: makeId("upgrade", clean.upgrades),
            name: `Upgrade ${clean.upgrades.length + 1}`,
            costCurrencyId: clean.currencies[0].id,
            affectedCurrencyId: clean.currencies[0].id,
            firstCost: 100,
            costGrowth: 2,
            multiplier: 1.5,
            maxLevel: 10,
            unlockArea: 1
          }
        ]
      };
    });
  }

  function addArea() {
    setModel((current) => {
      const clean = normalizeModel(current);

      return {
        ...clean,
        areas: [
          ...clean.areas,
          {
            id: makeId("area", clean.areas),
            name: `Area ${clean.areas.length + 1}`,
            costs: [],
            rewards: []
          }
        ]
      };
    });
  }

  function addSuggestedArea() {
    setModel((current) => {
      const clean = normalizeModel(current);

      return {
        ...clean,
        areas: [
          ...clean.areas,
          {
            id: makeId("area", clean.areas),
            name: nextArea.name,
            costs: nextArea.costs,
            rewards: []
          }
        ]
      };
    });
  }

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="pill">Incremental Game Balancer</p>
          <h1>Economy Simulator</h1>
          <p className="subtitle">
            Build currencies, passive income, upgrades, stacked multipliers, areas, costs, and rewards.
          </p>
        </div>

        <div className="statsGrid topStats">
          <div className="statCard">
            <span>Balance</span>
            <strong>{balanceGrade}</strong>
          </div>

          <div className="statCard">
            <span>Areas reached</span>
            <strong>
              {reachedAreas}/{normalized.areas.length}
            </strong>
          </div>

          <div className="statCard">
            <span>Avg step</span>
            <strong>{averageStep == null ? "—" : timeText(averageStep)}</strong>
          </div>
        </div>
      </header>

      <section className="layout">
        <aside className="panel builder">
          <h2>Model Builder</h2>

          <div className="tabs">
            {["main", "money", "sources", "upgrades", "areas"].map((name) => (
              <button
                key={name}
                className={tab === name ? "active" : ""}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>

          {tab === "main" && (
            <div className="section">
              <NumberInput
                label="Target time per area"
                value={normalized.targetSeconds / 60}
                suffix="min"
                step={0.5}
                onChange={(value) => setGlobal("targetSeconds", atLeast(value, 0.1) * 60)}
              />

              <NumberInput
                label="Simulation length"
                value={normalized.simulationMinutes}
                suffix="min"
                onChange={(value) => setGlobal("simulationMinutes", clamp(value, 1, 10080))}
              />

              <div className="buttonGrid">
                <button onClick={() => setModel(clone(EMPTY_MODEL))}>Clean</button>
                <button onClick={() => setModel(clone(EXAMPLE_MODEL))}>Example</button>
                <button onClick={() => setShowTests((value) => !value)}>
                  {showTests ? "Hide tests" : "Show tests"}
                </button>
              </div>

              {showTests && (
                <div className="tests">
                  {tests.map((test) => (
                    <div key={test.name}>
                      <span>{test.name}</span>
                      <b className={test.pass ? "goodText" : "badText"}>
                        {test.pass ? "PASS" : "FAIL"}
                      </b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "money" && (
            <div className="section">
              {normalized.currencies.map((currency, index) => (
                <div className="itemCard" key={currency.id}>
                  <TextInput
                    label="Currency name"
                    value={currency.name}
                    onChange={(name) => setCurrency(index, { name })}
                  />

                  <NumberInput
                    label="Starting amount"
                    value={currency.start}
                    onChange={(start) => setCurrency(index, { start: positive(start, 0) })}
                  />
                </div>
              ))}

              <button className="fullButton" onClick={addCurrency}>
                Add Currency
              </button>
            </div>
          )}

          {tab === "sources" && (
            <div className="section">
              {normalized.sources.map((source, index) => (
                <div className="itemCard" key={source.id}>
                  <TextInput
                    label="Source name"
                    value={source.name}
                    onChange={(name) => setSource(index, { name })}
                  />

                  <label className="field">
                    <span>Produces</span>
                    <CurrencySelect
                      model={normalized}
                      value={source.currencyId}
                      onChange={(currencyId) => setSource(index, { currencyId })}
                    />
                  </label>

                  <NumberInput
                    label="Amount earned"
                    value={source.amount}
                    onChange={(amount) => setSource(index, { amount: positive(amount, 0) })}
                  />

                  <NumberInput
                    label="Every X seconds"
                    value={source.everySeconds}
                    step={0.5}
                    onChange={(everySeconds) => setSource(index, { everySeconds: atLeast(everySeconds, 0.000001) })}
                  />

                  <NumberInput
                    label="Area growth"
                    value={source.areaGrowth}
                    step={0.05}
                    onChange={(areaGrowth) => setSource(index, { areaGrowth: atLeast(areaGrowth, 1) })}
                  />
                </div>
              ))}

              <button className="fullButton" onClick={addSource}>
                Add Income Source
              </button>
            </div>
          )}

          {tab === "upgrades" && (
            <div className="section">
              {normalized.upgrades.length === 0 && <p className="mutedBox">No upgrades yet.</p>}

              {normalized.upgrades.map((upgrade, index) => (
                <div className="itemCard" key={upgrade.id}>
                  <TextInput
                    label="Upgrade name"
                    value={upgrade.name}
                    onChange={(name) => setUpgrade(index, { name })}
                  />

                  <label className="field">
                    <span>Costs currency</span>
                    <CurrencySelect
                      model={normalized}
                      value={upgrade.costCurrencyId}
                      onChange={(costCurrencyId) => setUpgrade(index, { costCurrencyId })}
                    />
                  </label>

                  <label className="field">
                    <span>Multiplies</span>
                    <CurrencySelect
                      model={normalized}
                      value={upgrade.affectedCurrencyId}
                      includeAll
                      onChange={(affectedCurrencyId) => setUpgrade(index, { affectedCurrencyId })}
                    />
                  </label>

                  <NumberInput
                    label="First cost"
                    value={upgrade.firstCost}
                    onChange={(firstCost) => setUpgrade(index, { firstCost: positive(firstCost, 0) })}
                  />

                  <NumberInput
                    label="Cost growth"
                    value={upgrade.costGrowth}
                    step={0.05}
                    onChange={(costGrowth) => setUpgrade(index, { costGrowth: atLeast(costGrowth, 1) })}
                  />

                  <NumberInput
                    label="Multiplier per buy"
                    value={upgrade.multiplier}
                    step={0.05}
                    onChange={(multiplier) => setUpgrade(index, { multiplier: atLeast(multiplier, 1) })}
                  />

                  <NumberInput
                    label="Max level"
                    value={upgrade.maxLevel}
                    onChange={(maxLevel) => setUpgrade(index, { maxLevel: Math.round(clamp(maxLevel, 1, 999)) })}
                  />

                  <NumberInput
                    label="Unlocks at area"
                    value={upgrade.unlockArea}
                    onChange={(unlockArea) => setUpgrade(index, { unlockArea: Math.round(clamp(unlockArea, 1, 999)) })}
                  />
                </div>
              ))}

              <button className="fullButton" onClick={addUpgrade}>
                Add Upgrade
              </button>
            </div>
          )}

          {tab === "areas" && (
            <div className="section">
              {normalized.areas.map((area, index) => (
                <div className="itemCard" key={area.id}>
                  <TextInput
                    label="Area name"
                    value={area.name}
                    onChange={(name) => setArea(index, { name })}
                  />

                  <CurrencyRows
                    title="Costs"
                    model={normalized}
                    entries={area.costs}
                    emptyText="Free"
                    onChange={(costs) => setArea(index, { costs })}
                  />

                  <CurrencyRows
                    title="Rewards"
                    model={normalized}
                    entries={area.rewards}
                    emptyText="None"
                    onChange={(rewards) => setArea(index, { rewards })}
                  />
                </div>
              ))}

              <div className="buttonGrid">
                <button onClick={addArea}>Add Blank</button>
                <button onClick={addSuggestedArea}>Add Suggested</button>
              </div>
            </div>
          )}
        </aside>

        <section className="dashboard">
          <div className="statsGrid">
            <div className="statCard">
              <span>Main balance</span>
              <strong>{compact(simulation.balances[mainCurrency] || 0)}</strong>
              <small>{currencyName(normalized, mainCurrency)}</small>
            </div>

            <div className="statCard">
              <span>Income / second</span>
              <strong>{compact(simulation.finalIncome[mainCurrency] || 0)}</strong>
              <small>{currencyName(normalized, mainCurrency)}</small>
            </div>

            <div className="statCard">
              <span>Purchases</span>
              <strong>{simulation.purchases.length}</strong>
              <small>Auto-bought upgrades</small>
            </div>
          </div>

          <div className="panel">
            <h2>Warnings</h2>
            <div className="warnings">
              {warnings.map((warning, index) => (
                <div key={index} className={`warning ${warning.type}`}>
                  {warning.text}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Suggested Next Area</h2>
            <p className="muted">
              Suggested cost: <b>{formatCurrencyList(normalized, nextArea.costs, "Free")}</b>
            </p>
            <button onClick={addSuggestedArea}>Add Suggested Area</button>
          </div>
        </section>
      </section>

      <section className="panel">
        <h2>Area Progression</h2>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>Costs</th>
                <th>Rewards</th>
                <th>Reached At</th>
                <th>Time From Previous</th>
              </tr>
            </thead>

            <tbody>
              {simulation.areaRows.map((area) => (
                <tr key={area.id}>
                  <td>{area.name}</td>
                  <td>{formatCurrencyList(normalized, area.costs, "Free")}</td>
                  <td>{formatCurrencyList(normalized, area.rewards, "None")}</td>
                  <td>{area.unlockTime == null ? "Not reached" : timeText(area.unlockTime)}</td>
                  <td>{area.segmentTime == null ? "—" : timeText(area.segmentTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Final Income / Second</h2>

        <div className="incomeGrid">
          {normalized.currencies.map((currency) => (
            <div className="incomeCard" key={currency.id}>
              <span>{currency.name}</span>
              <strong>{compact(simulation.finalIncome[currency.id] || 0)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Upgrade Levels Reached</h2>

        {normalized.upgrades.length === 0 && <p className="muted">No upgrades yet.</p>}

        <div className="incomeGrid">
          {normalized.upgrades.map((upgrade) => (
            <div className="incomeCard" key={upgrade.id}>
              <span>{upgrade.name}</span>
              <strong>
                {simulation.levels[upgrade.id] || 0}/{upgrade.maxLevel}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}