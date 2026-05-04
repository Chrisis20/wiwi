export const EMPTY_MODEL = {
  targetSeconds: 600,
  simulationMinutes: 60,
  currencies: [
    {
      id: "currency_1",
      name: "Currency 1",
      start: 0
    }
  ],
  sources: [
    {
      id: "source_1",
      name: "Income Source 1",
      currencyId: "currency_1",
      amount: 1,
      everySeconds: 1,
      areaGrowth: 1
    }
  ],
  upgrades: [],
  areas: [
    {
      id: "area_1",
      name: "Area 1",
      costs: [],
      rewards: []
    }
  ]
};

export const EXAMPLE_MODEL = {
  targetSeconds: 600,
  simulationMinutes: 90,
  currencies: [
    {
      id: "rune",
      name: "Rune",
      start: 0
    },
    {
      id: "essence",
      name: "Essence",
      start: 0
    },
    {
      id: "soul",
      name: "Soul",
      start: 0
    }
  ],
  sources: [
    {
      id: "source_rune",
      name: "Rune Source",
      currencyId: "rune",
      amount: 5,
      everySeconds: 1,
      areaGrowth: 1.35
    },
    {
      id: "source_essence",
      name: "Essence Source",
      currencyId: "essence",
      amount: 1,
      everySeconds: 5,
      areaGrowth: 1.2
    }
  ],
  upgrades: [
    {
      id: "upgrade_rune",
      name: "Rune Multiplier",
      costCurrencyId: "rune",
      affectedCurrencyId: "rune",
      firstCost: 50,
      costGrowth: 2,
      multiplier: 1.35,
      maxLevel: 20,
      unlockArea: 1
    },
    {
      id: "upgrade_global",
      name: "Global Multiplier",
      costCurrencyId: "essence",
      affectedCurrencyId: "all",
      firstCost: 25,
      costGrowth: 2.35,
      multiplier: 1.25,
      maxLevel: 15,
      unlockArea: 2
    }
  ],
  areas: [
    {
      id: "area_1",
      name: "Area 1",
      costs: [],
      rewards: []
    },
    {
      id: "area_2",
      name: "Area 2",
      costs: [
        {
          currencyId: "rune",
          amount: 500
        }
      ],
      rewards: [
        {
          currencyId: "essence",
          amount: 10
        }
      ]
    },
    {
      id: "area_3",
      name: "Area 3",
      costs: [
        {
          currencyId: "rune",
          amount: 2500
        },
        {
          currencyId: "essence",
          amount: 100
        }
      ],
      rewards: [
        {
          currencyId: "soul",
          amount: 1
        },
        {
          currencyId: "rune",
          amount: 500
        }
      ]
    }
  ]
};