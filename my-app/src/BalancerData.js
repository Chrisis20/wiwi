export const EMPTY_MODEL = {
  targetTimeSeconds: 600,
  simulationMinutes: 60,
  ticksPerSecond: 1,
  currencies: [
    {
      id: "currency_1",
      name: "Currency 1",
      startingAmount: 0
    }
  ],
  generators: [
    {
      id: "gen_1",
      name: "Income Source 1",
      currencyId: "currency_1",
      baseAmount: 1,
      everySeconds: 1,
      growthPerArea: 1
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
  targetTimeSeconds: 600,
  simulationMinutes: 90,
  ticksPerSecond: 1,
  currencies: [
    {
      id: "rune",
      name: "Rune",
      startingAmount: 0
    },
    {
      id: "essence",
      name: "Essence",
      startingAmount: 0
    },
    {
      id: "soul",
      name: "Soul",
      startingAmount: 0
    }
  ],
  generators: [
    {
      id: "gen_rune",
      name: "Rune Source",
      currencyId: "rune",
      baseAmount: 5,
      everySeconds: 1,
      growthPerArea: 1.4
    },
    {
      id: "gen_essence",
      name: "Essence Source",
      currencyId: "essence",
      baseAmount: 1,
      everySeconds: 5,
      growthPerArea: 1.25
    }
  ],
  upgrades: [
    {
      id: "up_rune_power",
      name: "Rune Multiplier",
      currencyId: "rune",
      affectsCurrencyId: "rune",
      firstCost: 50,
      costGrowth: 2,
      multiplierPerBuy: 1.35,
      maxLevel: 20,
      unlockArea: 1
    },
    {
      id: "up_all_power",
      name: "Global Multiplier",
      currencyId: "essence",
      affectsCurrencyId: "all",
      firstCost: 25,
      costGrowth: 2.4,
      multiplierPerBuy: 1.25,
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