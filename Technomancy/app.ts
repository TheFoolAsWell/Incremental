﻿/// <reference path ="events.ts" />
/// <reference path ="spells.ts" />
declare var $: any;
declare var numberformat: any;

function format_num(num: number, show_decimals: boolean = true): string {
    if (num < 100000) { /* Show more precise values if we aren't going to numberformat*/
        if (show_decimals) {
            return (Math.round(num * 1000) / 1000).toString();
        } else {
            return Math.round(num).toString()
        }
    } else {
        if (show_decimals) {
            return numberformat.formatShort(num, { sigfigs: 5 });
        } else {
            return numberformat.formatShort(num, { sigfigs: 3 });
        }
    }
}
var resources = {};
var resources_per_sec = {};
var buildings = {};
var purchased_upgrades = []; /* Names of all purchased upgrades */
var remaining_upgrades = {}; /* All remaining upgrades that need to be purchased */
const UNLOCK_TREE = { /* What buildings unlock */
    "s_manastone": [],
    "s_goldboost": [],
    "s_energyboost": [],
    "s_trade": [],
    "s_startboost": [],
    "s_time_magic": [],
    "s_workshop": [],
    "s_mana_refinery": [],
    "s_workshop_2": [],

    "bank": ["mine", "logging"],
    "mine": ["furnace", "gold_finder"],
    "logging": ["compressor"],
    "furnace": [],
    "compressor": ["oil_well"],
    "gold_finder": ["jeweler"],
    "jeweler": ["jewelry_store"],
    "glass_jeweler": ["jewelry_store"],
    "jewelry_store": [],
    "oil_well": ["oil_engine"],
    "oil_engine": ["paper_mill", "ink_refinery", "s_energyboost"],
    "paper_mill": ["money_printer"],
    "ink_refinery": [],
    "money_printer": ["book_printer"],
    "book_printer": ["library"],
    "library": ["water_purifier", "solar_panel"],
    "solar_panel": [],
    "water_purifier": ["hydrogen_gen", "hydrogen_burner"],
    "hydrogen_gen": [],
    "hydrogen_burner": [],
    "skyscraper": ["big_bank"],
    "big_bank": ["big_mine"],
    "big_mine": [],
    "reactor": ["fuel_maker"],
    "fuel_maker": [],
    "hydrogen_mine": [],
};
const SPELL_BUILDINGS = [
    "s_manastone",
    "s_goldboost",
    "s_energyboost",
    "s_trade",
    "s_startboost",
    "s_time_magic",
    "s_workshop",
    "s_mana_refinery",
    "s_workshop_2",
  ];


var to_next_trade = 60000;


function set_initial_state() {
    resources = {
        "time": { "amount": 0, "value": -2 },
        "refined_mana": { "amount": 0, "value": -1 },
        "fuel": { "amount": 0, "value": -1000 },

        "mana": { "amount": 0, "value": 0 },
        "energy": { "amount": 0, "value": 0 }, 
        "research": { "amount": 0, "value": 0 },
        "manager": { "amount": 0, "value": 0 },

        "money": { "amount": 10, "value": 1 },
        "stone": { "amount": 0, "value": 0.5 },
        "wood": { "amount": 0, "value": 0.5 },
        "iron_ore": { "amount": 0, "value": 1 },
        "coal": { "amount": 0, "value": 1 },
        "iron": { "amount": 0, "value": 4 },
        "gold": { "amount": 0, "value": 50 },
        "diamond": { "amount": 0, "value": 75 },
        "jewelry": { "amount": 0, "value": 300 },
        "oil": { "amount": 0, "value": 2 },
        "paper": { "amount": 0, "value": 4 },
        "ink": { "amount": 0, "value": 10 },
        "book": { "amount": 0, "value": 400 },
        "sand": { "amount": 0, "value": 3 },
        "glass": { "amount": 0, "value": 5 },
        "water": { "amount": 0, "value": 2 },
        "hydrogen": { "amount": 0, "value": 5 },
        "steel_beam": { "amount": 0, "value": 200 },
        "uranium": { "amount": 0, "value": 500 },

    };
    /* Set resources_per_sec */
    Object.keys(resources).forEach(function (res) {
        resources_per_sec[res] = 0;
    });
    buildings = {
        "s_manastone": {
            "on": true,
            "amount": 0,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": 1,
            },
            "update": "nop",
            "flavor": "A stone made out of pure crystallized mana. Use it to power spells!",
        },
        "s_goldboost": {
            "on": false,
            "amount": 2,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "update": "goldboost",
            "flavor": "A magic spell made for tax fraud.",
        },
        "s_energyboost": {
            "on": false,
            "amount": 1,
            "base_cost": {  },
            "price_ratio": {  },
            "generation": {
                "mana": -3,
                "energy": 1,
            },
            "update": "nop",
            "flavor": "This is actually a much simpler spell than the name implies.",
        },
        "s_trade": {
            "on": false,
            "amount": 6,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "update": "trade",
            "flavor": "With an infinite variety of things, you would think you could find some apples for sale. But you can't.",
        },
        "s_startboost": {
            "on": false,
            "amount": 25,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
                "money": 1,
                "stone": 2,
                "wood": 2,
                "iron_ore": 5/25,
                "oil": .5/25,
            },
            "update": "nop",
            "flavor": "I HAVE THE POWER!",
        },
        "s_time_magic": {
            "on": false,
            "amount": 40,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "update": "time",
            "flavor": "I HAVE THE POWER!",
        },
        "s_workshop": {
            "on": false,
            "amount": 50,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "update": "nop",
            "mode": "iron",
            "flavor": "Yay, you can read my code.",
        },
        "s_mana_refinery": {
            "on": true,
            "amount": 1,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": 0,
            },
            "update": "refinery",
            "flavor": "That's some fine mana.",
        },
        "s_workshop_2": {
            "on": false,
            "amount": 200,
            "base_cost": { },
            "price_ratio": { },
            "generation": {
                "mana": -1,
            },
            "update": "workshop",
            "flavor": "Work. Work. Work. Work. Shop.",
        },

        "bank": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 10,
            },
            "price_ratio": {
                "money": 1.1,
            },
            "generation": {
                "money": 1,
            },
            "flavor": "It's a pretty small branch bank.",
        },
        "mine": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 30,
            },
            "price_ratio": {
                "money": 1.2,
            },
            "generation": {
                "money": -1,
                "stone": 1,
                "iron_ore": 0.1,
            },
            "flavor": "IT'S ALL MINE!",
        },
        "logging": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 30,
            },
            "price_ratio": {
                "money": 1.2,
            },
            "generation": {
                "money": -1,
                "wood": 1,
                "coal": 0.1,
            },
            "flavor": "console.log('Player read tooltip.')",
        },
        "furnace": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 200,
                "stone": 50,
            },
            "price_ratio": {
                "money": 1.1,
                "stone": 1.2,
            },
            "generation": {
                "wood": -5,
                "iron_ore": -3,
                "iron": 1,
                "coal": 1,
            },
            "flavor": "Come on in! It's a blast!",
        },
        "compressor": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 100,
                "stone": 300,
                "iron": 100
            },
            "price_ratio": {
                "money": 1.3,
                "stone": 1.3,
                "iron": 1.3,
            },
            "generation": {
                "coal": -10,
                "diamond": 0.1,
            },
            "flavor": "",
        },
        "gold_finder": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 500,
                "stone": 1000,
                "wood": 400
            },
            "price_ratio": {
                "money": 1.3,
                "stone": 1.3,
                "wood": 1.2,
            },
            "generation": {
                "stone": -10,
                "gold": 0.1,
            },
            "flavor": "",
        },
        "jeweler": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 750,
                "stone": 1000,
            },
            "price_ratio": {
                "money": 1.3,
                "stone": 1.3,
            },
            "generation": {
                "gold": -3,
                "diamond": -1,
                "jewelry": 1,
            },
            "flavor": "A jeweler uses jewels to make jewelry in July.",
        },
        "glass_jeweler": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 2500,
                "glass": 300,
            },
            "price_ratio": {
                "money": 1.3,
                "glass": 1.3,
            },
            "generation": {
                "glass": -10,
                "jewelry": .5,
            },
            "flavor": "Oooooh.... shiny!",
        },
        "jewelry_store": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 5000,
                "stone": 500,
                "wood": 750
            },
            "price_ratio": {
                "money": 1.5,
                "stone": 1.4,
                "wood": 1.4,
            },
            "generation": {
                "jewelry": -1,
                "money": 400,
            },
            "flavor": "And the cycle repeats...",
        },
        "oil_well": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 1000,
                "stone": 1000,
                "iron": 500
            },
            "price_ratio": {
                "money": 1.2,
                "stone": 1.1,
                "iron": 1.3,
            },
            "generation": {
                "oil": 0.1,
            },
            "flavor": "Well, this gets you oil.",
        },
        "oil_engine": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 500,
                "iron": 200
            },
            "price_ratio": {
                "money": 1.3,
                "iron": 1.3,
            },
            "generation": {
                "oil": -1,
                "energy": 1,
            },
            "flavor": "",
        },
        "paper_mill": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 200,
                "iron": 200,
                "oil": 100,
            },
            "price_ratio": {
                "money": 1.1,
                "iron": 1.1,
                "oil": 1.1
            },
            "generation": {
                "energy": -1,
                "wood": -3,
                "paper": 1,
            },
            "flavor": "",
        },
        "ink_refinery": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 200,
                "iron": 200,
                "oil": 100,
            },
            "price_ratio": {
                "money": 1.1,
                "iron": 1.1,
                "oil": 1.1
            },
            "generation": {
                "energy": -1,
                "oil": -3,
                "ink": 1,
            },
            "flavor": "",
        },
        "money_printer": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 500,
                "iron": 500,
                "oil": 200,
            },
            "price_ratio": {
                "money": 1.2,
                "iron": 1.2,
                "oil": 1.3,
            },
            "generation": {
                "energy": -1,
                "paper": -2,
                "ink": -1,
                "money": 30,
            },
            "flavor": "100% legal. Trust me on this.",
        },
        "book_printer": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 5000,
                "iron": 700,
                "oil": 500,
            },
            "price_ratio": {
                "money": 1.2,
                "iron": 1.2,
                "oil": 1.3,
            },
            "generation": {
                "energy": -1,
                "paper": -2,
                "ink": -1,
                "book": 0.1,
            },
            "flavor": "It's actually just printing a bunch of copies of My Immortal.",
        },
        "library": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 2500,
                "wood": 2500,
                "iron": 50,
                "book": 10,
            },
            "price_ratio": {
                "money": 1.2,
                "iron": 1.4,
                "wood": .95,
                "book": 1.1,
            },
            "generation": {
                "research": 1,
            },
            "flavor": "They do very important research here. <br />DO NOT DISTURB THE LIBRARIANS.",
        },
        "solar_panel": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 50000,
                "glass": 100,
                "coal": 100,
                "diamond": 100,
            },
            "price_ratio": {
                "money": .8,
                "glass": 2,
                "coal": 1.5,
                "diamond": 1.5,
            },
            "generation": {
                "energy": 1,
            },
            "flavor": "Praise the sun!",
        },

        "water_purifier": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 500,
                "stone": 500,
                "sand": 500,
                "glass": 100,
            },
            "price_ratio": {
                "money": 1.1,
                "stone": 1.1,
                "sand": 1.1,
                "glass": 1.1,
            },
            "generation": {
                "water": 1,
            },
            "flavor": "To find sand, first you must collect enough mana.",
        },
        "hydrogen_gen": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 2500,
                "glass": 500,
            },
            "price_ratio": {
                "money": 1.1,
                "glass": 1.2,
            },
            "generation": {
                "energy": -2,
                "water": -1,
                "hydrogen": 2,
            },
            "flavor": "Runs electricity through water...",
        },
        "hydrogen_burner": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 2500,
                "iron": 500,
            },
            "price_ratio": {
                "money": 1.1,
                "iron": 1.2,
            },
            "generation": {
                "hydrogen": -20,
                "energy": 10,
                "water": 7,
            },
            "flavor": "...And lights it on fire!",
        },
        "skyscraper": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 5000,
                "steel_beam": 25,
                "glass": 50,
            },
            "price_ratio": {
                "money": 1.09,
                "steel_beam": 1.1,
                "glass": 1.1,
            },
            "generation": {
                "manager": 1,
            },
            "flavor": "Only one per floor so they don't get in each others' ways.",
        },
        "big_bank": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 25000,
                "stone": 25000,
                "glass": 100,
            },
            "price_ratio": {
                "money": 1.2,
                "stone": 1.1,
                "glass": 1.2,
            },
            "generation": {
                "manager": -1,
                "money": 50,
            },
            "flavor": "Serious business",
        },
        "big_mine": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 10000,
                "steel_beam": 100,
                "wood": 20000,
            },
            "price_ratio": {
                "money": 1.1,
                "steel_beam": 1.03,
                "wood": 1.1,
            },
            "generation": {
                "manager": -1,
                "money": -100,
                "stone": 30,
                "iron_ore": 10,
                "coal": 3,
                "iron": 2,
                "gold": .5,
                "diamond": .1,
                "sand": 10,
            },
            "flavor": "Seriouser business",
        },
        "reactor": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 1000000,
                "steel_beam": 100,
                "iron": 10000,
            },
            "price_ratio": {
                "money": 1.1,
                "steel_beam": 1.07,
                "iron": 1.2,
            },
            "generation": {
                "manager": -3,
                "uranium": -0.1,
                "water": -15,
                "energy": 50,
            },
            "flavor": "Don't let it go boom!",
        },
        "fuel_maker": {
            "on": true,
            "amount": 0,
            "base_cost": {
                "money": 1500000,
                "steel_beam": 250,
                "iron": 50000,
                "gold": 3000,
                "research": 20,
            },
            "price_ratio": {
                "money": 1.1,
                "steel_beam": 1.07,
                "iron": 1.2,
                "gold": 1.1,
                "research": 1.2,
            },
            "generation": {
                "energy": -75,
                "uranium": -0.1,
                "hydrogen": -150,
                "refined_mana": -1,
                "fuel": 0.01,
            },
            "flavor": "This fuel is... not healthy.",
        },

        "hydrogen_mine": {
            "on": true,
            "amount": 0,
            "base_cost": { }, /* Free, but you can't buy it. */
            "price_ratio": { },
            "generation": {
                "hydrogen": 30,
            },
            "flavor": "The moon rocks. And now you can have those rocks.",
        },

    };
    purchased_upgrades = [];
    remaining_upgrades = {
        "better_mines": {
            "unlock": function () { return buildings["mine"].amount >= 3; },
            "purchase": function () { /* When bought, turn all mines off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let mines_state = buildings["mine"].on;
                if (mines_state) {
                    toggle_building_state("mine");

                }
                buildings["mine"]["generation"]["stone"] *= 2;
                buildings["mine"]["generation"]["iron_ore"] *= 5;
                if (mines_state) { /* Only turn on if it already was on */
                    toggle_building_state("mine");
                }
            },
            "cost": {
                "money": 2000,
                "stone": 500,
                "iron": 500,
            },
            "tooltip": "Mines produce double stone and 5x iron. <br /> Costs 2000 money, 500 stone, 500 iron.",
            "name": "Improve Mines",
            "image": "pickaxe.png",
        },
        "better_logging": {
            "unlock": function () { return buildings["logging"].amount >= 3 && buildings["s_manastone"].amount >= 5; },
            "purchase": function () { /* When bought, turn all mines off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let build_state = buildings["logging"].on;
                if (build_state) {
                    toggle_building_state("logging");

                }
                buildings["logging"]["generation"]["wood"] *= 2;
                buildings["logging"]["generation"]["coal"] *= 3;
                if (build_state) { /* Only turn on if it already was on */
                    toggle_building_state("logging");
                }
            },
            "cost": {
                "money": 2000,
                "wood": 500,
                "iron": 500,
            },
            "tooltip": "console.err('Upgrade not purchased, player needs to buy it!'); <br /> Costs 2000 money, 500 wood, 500 iron.",
            "name": "Magical Trees",
            "image": "",
        },
        "coal_mines": {
            "unlock": function () { return buildings["mine"].amount >= 3 && buildings["compressor"].amount >= 1 && (resources["coal"].amount < 50 || resources["research"].amount > 5); },
            "purchase": function () { /* When bought, turn all mines off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let mines_state = buildings["mine"].on;
                if (mines_state) {
                    toggle_building_state("mine");

                }
                buildings["mine"]["generation"]["coal"] = 0.2;
                if (mines_state) { /* Only turn on if it already was on */
                    toggle_building_state("mine");
                }
            },
            "cost": {
                "money": 1000,
                "stone": 500,
                "wood": 500,
            },
            "tooltip": "Mines produce coal.<br /> Costs 1000 money, 500 stone, 500 wood.",
            "name": "Coal Mining <br />",
            "image": "pickaxe.png",
        },
        "better_compressors": {
            "unlock": function () { return buildings["compressor"].amount >= 1; },
            "purchase": function () { /* When bought, turn all compressors off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["compressor"].on;
                if (comp_state) {
                    toggle_building_state("compressor");

                }
                buildings["compressor"]["generation"]["coal"] *= 0.7;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("compressor");
                }
            },
            "cost": {
                "money": 3000,
                "iron": 1000,
            },
            "tooltip": "Compressors use 30% less coal. <br /> Costs 3000 money, 1000 iron.",
            "name": "Improve Compressors",
            "image": "diamond.png",
        },
        "oiled_compressors": {
            "unlock": function () { return buildings["compressor"].amount >= 1 && resources["oil"].amount > 20; },
            "purchase": function () { /* When bought, turn all compressors off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["compressor"].on;
                if (comp_state) {
                    toggle_building_state("compressor");
                }
                buildings["compressor"]["generation"]["coal"] *= 0.9;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("compressor");
                }
            },
            "cost": {
                "oil": 50,
            },
            "tooltip": "Oil your compressors to have them run more efficiently. <br /> Costs 50 oil.",
            "name": "Oil Compressors",
            "image": "diamond.png",
        },
        "better_oil": {
            "unlock": function () { return buildings["oil_well"].amount >= 1 && buildings["oil_well"].generation["oil"] < 1; },
            "purchase": function () { /* When bought, turn all off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["oil_well"].on;
                if (comp_state) {
                    toggle_building_state("oil_well");
                }
                buildings["oil_well"]["generation"]["oil"] *= 5;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("oil_well");
                }
            },
            "cost": {
                "oil": 100,
            },
            "tooltip": "Get more oil for your wells. <br /> Costs 100 oil.",
            "name": "Fracking",
            "image": "",
        },
        "even_better_oil": {
            "unlock": function () { return buildings["oil_well"].amount >= 1 && buildings["oil_well"].generation["oil"] < 1; },
            "purchase": function () { /* When bought, turn all off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["oil_well"].on;
                if (comp_state) {
                    toggle_building_state("oil_well");
                }
                buildings["oil_well"]["generation"]["oil"] *= 2;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("oil_well");
                }
            },
            "cost": {
                "oil": 500,
                "research": 1,
            },
            "tooltip": "If it worked once, why not again? <br /> Costs 500 oil.<br />Requires 1 research.",
            "name": "More Fracking",
            "image": "",
        },
        "cheaper_banks": {
            "unlock": function () { return resources["money"].amount >= 2500 && buildings["bank"].amount >= 20; },
            "purchase": function () { 
                buildings["bank"].price_ratio["money"] = (buildings["bank"].price_ratio["money"] - 1) * .7 + 1;
            },
            "cost": {
                "money": 5000,
                "iron": 1000,
            },
            "tooltip": "Banks are cheaper to buy.<br /> Costs 5000 money, 1000 iron.",
            "name": "Build a vault <br />",
            "image": "money.png",
        },
        "better_paper": {
            "unlock": function () { return buildings["paper_mill"].amount >= 3; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["paper_mill"].on;
                if (comp_state) {
                    toggle_building_state("paper_mill");

                }
                buildings["paper_mill"]["generation"]["paper"] *= 2;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("paper_mill");
                }
            },
            "cost": {
                "money": 10000,
                "iron": 1000,
                "oil": 500,
                "research": 5,
            },
            "tooltip": "Make thinner paper, creating double the paper per wood.<br /> Costs 10000 money, 1000 iron, 500 oil. <br /> Requires research level of 5.",
            "name": "Thinner paper",
            "image": "gear.png",
        },
        "better_furnace": {
            "unlock": function () { return buildings["furnace"].amount >= 3; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["furnace"].on;
                if (comp_state) {
                    toggle_building_state("furnace");

                }
                Object.keys(buildings["furnace"].generation).forEach(function (res) {
                    buildings["furnace"].generation[res] *= 10;
                });
                buildings["furnace"].generation["wood"] *= .7;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("furnace");
                }
            },
            "cost": {
                "money": 10000,
                "stone": 30000,
                "wood": 20000,
                "coal": 2000,
            },
            "tooltip": "Much hotter furnaces run at 10x the previous rate and consume slightly less wood. <br /> Costs 10000 money, 30000 stone, 20000 wood, 2000 coal.",
            "name": "Hotter furnaces",
            "image": "fire.png",
        },
        "better_gold": {
            "unlock": function () { return buildings["gold_finder"].amount >= 3; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["gold_finder"].on;
                if (comp_state) {
                    toggle_building_state("gold_finder");

                }
                buildings["gold_finder"].generation["gold"] *= 2;
                buildings["gold_finder"].generation["iron"] = 0.05;

                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("gold_finder");
                }
            },
            "cost": {
                "money": 25000,
                "gold": 500,
                "iron": 1000,
            },
            "tooltip": "Special gold-plated magnets that attract only gold. And a bit of iron. <br /> Costs 25000 money, 500 gold, 1000 iron.",
            "name": "Gold magnet <br />",
            "image": "money.png",
        },
        "gold_crusher": {
            "unlock": function () { return buildings["gold_finder"].amount >= 5 && buildings["s_manastone"].amount >= 10; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["gold_finder"].on;
                if (comp_state) {
                    toggle_building_state("gold_finder");

                }
                buildings["gold_finder"].generation["sand"] = 2;
                buildings["gold_finder"].generation["gold"] *= 2;

                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("gold_finder");
                }
            },
            "cost": {
                "money": 25000,
                "iron": 2000,
                "stone": 20000,
            },
            "tooltip": "Crushes stone into sand, improving gold find rate. <br /> Costs 25000 money, 2000 iron, 20000 stone.",
            "name": "Destructive Sifter",
            "image": "sand.png",
        },
        "glass_furnace": {
            "unlock": function () { return buildings["furnace"].amount >= 2 && resources["sand"].amount >= 10 && purchased_upgrades.indexOf("better_furnace") != -1; },
            "purchase": function () { /* When bought, turn all buildings off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["furnace"].on;
                if (comp_state) {
                    toggle_building_state("furnace");

                }
                buildings["furnace"].generation["sand"] = -1;
                buildings["furnace"].generation["glass"] = 1;

                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("furnace");
                }
            },
            "cost": {
                "money": 250000,
                "iron": 20000,
                "wood": 50000,
            },
            "tooltip": "Furnaces now smelt sand into glass at a rate of 1/s. <br /> Costs 250K money, 20000 iron, 50000 wood.",
            "name": "Glass Furnace",
            "image": "sand.png",
        },
        "skyscraper": {
            "unlock": function () { return resources["steel_beam"].amount > 5 && buildings["skyscraper"].amount < 1; },
            "purchase": function () {
                /* Give them the first skyscraper. */
                /* So to do this we give them enough resources to buy and then just buy it */
                /* That keeps all the nasty issues of updating everything away */
                Object.keys(buildings["skyscraper"].base_cost).forEach(function (res) {
                    resources[res].amount += buildings["skyscraper"].base_cost[res];
                });

                purchase_building("skyscraper");
            },
            "cost": {
                "money": 25000,
                "steel_beam": 50,
                "glass": 250,
            },
            "tooltip": "Build the first floor of a skyscraper for some managers to live in. <br /> Costs 25000 money, 50 steel beam, 250 glass.",
            "name": "Skyscrapers",
            "image": "",
        },
        "glassblowing": {
            "unlock": function () { return resources["glass"].amount > 5; },
            "purchase": function () {
                /* Give them the first building. */
                /* So to do this we give them enough resources to buy and then just buy it */
                /* That keeps all the nasty issues of updating everything away */
                Object.keys(buildings["glass_jeweler"].base_cost).forEach(function (res) {
                    resources[res].amount += buildings["glass_jeweler"].base_cost[res];
                });

                purchase_building("glass_jeweler");
            },
            "cost": {
                "money": 25000,
                "glass": 250,
                "research": 7,
            },
            "tooltip": "Research how to blow glass into jewelry. <br /> Costs 25000 money, 250 glass. <br />Requires 7 research.",
            "name": "Glassblowing",
            "image": "",
        },
        "better_jeweler": {
            "unlock": function () { return resources["sand"].amount > 0 && resources["paper"].amount > 0; },
            "purchase": function () {
                let comp_state = buildings["jeweler"].on;
                if (comp_state) {
                    toggle_building_state("jeweler");
                }

                buildings["jeweler"]["generation"]["diamond"] *= .8;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("jeweler");
                }
            },
            "cost": {
                "money": 250000,
                "sand": 2500,
                "paper": 5000,
                "research": 12,
            },
            "tooltip": "Sand diamonds for a bright polish! <br /> Costs 250000 money, 2500 sand, 5000 paper. <br />Requires 12 research.",
            "name": "Sandpaper",
            "image": "",
        },
        "better_jewelry_store": {
            "unlock": function () { return resources["jewelry"].amount > 100 && resources["manager"].amount > 0; },
            "purchase": function () {
                let comp_state = buildings["jewelry_store"].on;
                if (comp_state) {
                    toggle_building_state("jewelry_store");
                }

                buildings["jewelry_store"]["generation"]["money"] *= 2;
                buildings["jewelry_store"]["generation"]["manager"] = -1;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("jewelry_store");
                }
            },
            "cost": {
                "money": 10000000,
                "research": 8,
            },
            "tooltip": "High-pressure sales tactics let you sell jewelry for more. But you'll need managers to keep employees in line. <br /> Costs 10M money. <br />Requires 8 research.",
            "name": "Sleazy Managers",
            "image": "",
        },
        "better_trades": {
            "unlock": function () { return resources["refined_mana"].amount >= 1000 && buildings["s_trade"].on; },
            "purchase": function () {},
            "cost": {
                "refined_mana": 10000,
                "gold": 500,
            },
            "tooltip": "Your portals cover more of the market, letting you get better deals. <br /> Costs 10000 refined mana, 500 gold.",
            "name": "Mystic Portals",
            "image": "money.png",
        },
        "better_trades_2": {
            "unlock": function () { return purchased_upgrades.indexOf("better_trades") != -1; },
            "purchase": function () {},
            "cost": {
                "refined_mana": 30000,
                "diamond": 1000,
            },
            "tooltip": "Your portals cover more of the market, letting you get better deals. <br /> Costs 30000 refined mana, 1000 diamond.",
            "name": "Arcane Portals",
            "image": "diamond.png",
        },
        "better_time": {
            "unlock": function () { return buildings["s_time_magic"].on; },
            "purchase": function () { /* When bought, turn all off, increase generation, and turn them back on again. Turns off first to get generation from them properly calculated */
                let comp_state = buildings["s_time_magic"].on;
                if (comp_state) {
                    toggle_building_state("s_time_magic");
                }
                buildings["s_time_magic"]["amount"] -= 10;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("s_time_magic");
                }
                $("#building_s_time_magic > .building_amount").text("30");
            },
            "cost": {
                "time": 30000,
            },
            "tooltip": "Throw away some extra time. You didn't need that, did you? <br /> Costs 30000 time.",
            "name": "Time removal",
            "image": "shield_power.png",
        },
        "uranium_finance": {
            "unlock": function () { return typeof event_flags["bribed_politician"] != "undefined" && event_flags["bribed_politician"] == "money" && buildings["s_manastone"].amount >= 200; },
            "purchase": function () { },
            "cost": {
                "money": 10000000,
                "research": 15,
            },
            "tooltip": "Get some of what you invest in. Sometimes. <br /> Costs 10M money. <br /> Requires 15 research.",
            "name": "Investment Embezzling",
            "image": "uranium.png",
        },
        "uranium_environment": {
            "unlock": function () { return typeof event_flags["bribed_politician"] != "undefined" && event_flags["bribed_politician"] == "environment" && buildings["s_manastone"].amount >= 200; },
            "purchase": function () {
                let comp_state = buildings["big_mine"].on;
                if (comp_state) {
                    toggle_building_state("big_mine");
                }

                buildings["big_mine"]["generation"]["uranium"] = .01;
                if (comp_state) { /* Only turn on if it already was on */
                    toggle_building_state("big_mine");
                }
            },
            "cost": {
                "money": 50000000,
                "research": 15,
            },
            "tooltip": "Huh, what's this metal your strip mines are finding? <br /> Costs 50M money. <br /> Requires 15 research.",
            "name": "Deeper mines",
            "image": "uranium.png",
        },
        "uranium_power": {
            "unlock": function () { return resources["uranium"].amount > 10; },
            "purchase": function () {
                Object.keys(buildings["reactor"].base_cost).forEach(function (res) {
                    resources[res].amount += buildings["reactor"].base_cost[res];
                });

                purchase_building("reactor");
            },
            "cost": {
                "money": 100000000,
                "research": 20,
            },
            "tooltip": "Research how to use uranium for energy. <br /> Costs 100M money. <br /> Requires 20 research.",
            "name": "Uranium Research",
            "image": "uranium.png",
        },
        "more_events": {
            "unlock": function () { return resources["uranium"].amount > 10; },
            "purchase": function () { },
            "cost": {
                "time": 20000,
                "refined_mana": 10000,
            },
            "tooltip": "Events are more common. <br /> Costs 20,000 time, 10,000 refined mana.",
            "name": "Unlimited Events",
            "image": "shield_on.png",
        },
        "better_library": {
            "unlock": function () { return adventure_data["cath_discovery"] >= 3; }, /* Only unlock when they adventure enough. */
            "purchase": function () {
                buildings["library"].price_ratio["iron"] = (buildings["library"].price_ratio["iron"] - 1) * .75 + 1;
                buildings["library"].price_ratio["book"] = (buildings["library"].price_ratio["book"] - 1) * .75 + 1;

                buildings["book_printer"].flavor = "New and improved: now prints 50 Shades of Grey.";
            },
            "cost": {
                "book": 5000,
            },
            "tooltip": "Print more material for your libraries. <br /> Costs 5,000 book.",
            "name": "Reading Material",
            "image": "",
        },
        "better_library_2": {
            "unlock": function () { return purchased_upgrades.indexOf("better_library") != -1; }, /* Takes previous one to be allowed.  */
            "purchase": function () {
                buildings["library"].price_ratio["iron"] = (buildings["library"].price_ratio["iron"] - 1) * .67 + 1;
                buildings["library"].price_ratio["book"] = (buildings["library"].price_ratio["book"] - 1) * .67 + 1;

                buildings["book_printer"].flavor = "New and even more improved: now prints Harry Potter. All of them.";
            },
            "cost": {
                "book": 15000,
            },
            "tooltip": "Start printing actually good books for your libraries. <br /> Costs 15,000 book.",
            "name": "Good Reading Material",
            "image": "",
        },


    };
    event_flags = {};
    $("#buy_amount").val(1);
}

function prestige() {
    /* Calculate mana gain */
    let prestige_points = 0;
    let mana = buildings["s_manastone"].amount;
    Object.keys(resources).forEach((res) => prestige_points += resources[res].amount * Math.abs(resources[res].value));

    let mana_gain = prestige_points / 20000 - Math.pow(mana, 1.3) * .5; /* One for every 20k pp, and apply reduction based off of current mana */
    mana_gain = Math.floor(Math.pow(Math.max(0, mana_gain), .4)); /* Then raise to .33 power and apply some rounding/checking */
    mana_gain = mana_gain / (1 + Math.floor(mana / 50) * .5); /* Then divide gain by a number increasing every 50 mana. */
    if (mana_gain > 50) { /* If they're getting a ton, they get less*/
        mana_gain = 50 + (mana_gain - 50) / 2 ;
    }
    mana_gain = Math.round(mana_gain);
    if (mana_gain < 1) {
        let percent_through = Math.max(0, Math.min(100, Math.floor((prestige_points / 20000) / (Math.pow(mana, 1.3) * .5 + 1) * 100)));
        if (!confirm("Prestige now wouldn't produce mana! As you get more mana, it gets harder to make your first mana stone in a run. You are currently " + percent_through.toString() + "% of the way to your first mana. Prestige anyway?")) {
            return;
        }
    }
    if (confirm("You will lose all resources and all buildings but gain " + mana_gain.toString() + " mana after reset. Proceed?")) {
        SPELL_BUILDINGS.forEach(function (build) { /* Turn off all spells */
            if (buildings[build].on) {
                toggle_building_state(build);
            }
        });
        let total_mana = buildings["s_manastone"].amount + mana_gain;
        set_initial_state();
        buildings["s_manastone"].amount = total_mana;
        adventure_data.current_location = "home"; /* You have to prestige at home. */
        save();
        location.reload();
    }

}

function add_log_elem(to_add: string) {
    while ($("#log > span").length >= 10) { /* We want to remove the last element(s) to bring length to 9.*/
        $("#log > span").last().remove(); /* Remove last child. Repeat until no more. */
    }
    $("#log").prepend("<span>" + to_add + "<br />" + "</span>");
}

function save() {
    Object.keys(resources).forEach(function (type) {
        localStorage["res-" + type] = resources[type].amount;
    });
    Object.keys(buildings).forEach(function (type) {
        localStorage["build-" + type] = JSON.stringify(buildings[type]);
    });
    localStorage["flags"]     = JSON.stringify(event_flags);
    localStorage["upgrades"]  = JSON.stringify(purchased_upgrades);
    localStorage["last_save"] = Date.now();
    localStorage["adventure"] = JSON.stringify(adventure_data)
    $('#save_text').css('opacity', '1'); setTimeout(() => $('#save_text').css({ 'opacity': '0', 'transition': 'opacity 1s' }), 1000);
    console.log("Saved");
    add_log_elem("Saved!");
}

function load() {
    console.log("Loading resources...");
    Object.keys(resources).forEach(function (type) {
        if (localStorage.getItem("res-" + type)) {
            resources[type].amount = parseFloat(localStorage.getItem("res-" + type));
        }
    });
    console.log("Loading buildings...");
    Object.keys(buildings).forEach(function (type) {
        if (localStorage.getItem("build-" + type)) {
            buildings[type] = JSON.parse(localStorage.getItem("build-" + type));
            /* Show how many buildings they have and set tooltip properly */
            $('#building_' + type + " > .building_amount").html(buildings[type].amount.toString());
        } 
    });
    console.log("Loading flags...");
    if (localStorage.getItem("flags")) {
        event_flags = JSON.parse(localStorage.getItem("flags"));
    } 
    if (buildings["s_manastone"].amount > 0) {
        $("#spells").removeClass("hidden");
        s_workshop(buildings["s_workshop"].mode); /* Load workshop option */
    }
    console.log("Loading upgrades...");
    if (!localStorage.getItem("upgrades")) {
        purchased_upgrades = [];
    } else {
        purchased_upgrades = JSON.parse(localStorage.getItem("upgrades"));
    }
    console.log("Loading last update");
    if (localStorage.getItem("last_save")) {
        last_update = parseInt(localStorage.getItem("last_save"));
    }
    console.log("Loading adventure mode");
    if (localStorage.getItem("adventure")) {
        adventure_data = JSON.parse(localStorage.getItem("adventure"));
    }
    console.log("Loading theme");
    if (!localStorage.getItem("theme")) {
        localStorage["theme"] = "dark"; /* Default dark theme. */
    }
    change_theme(localStorage.getItem("theme"));

    purchased_upgrades.forEach(function (upg) {
        let upg_name = remaining_upgrades[upg].name;
        delete remaining_upgrades[upg]; /* They shouldn't be able to get the same upgrade twice, so delete what was bought. */
        update_total_upgrades(upg_name);
    });

    /* Recalculate earnings. Loop through each building */
    Object.keys(buildings).forEach(function (name) {
        /* See if it's on */
        if (buildings[name].on) {
            /* Go through each resource it generates... */
            Object.keys(buildings[name].generation).forEach(function (key) {
                /* And increase production */
                resources_per_sec[key] += buildings[name].amount * buildings[name].generation[key];
            });

            $("#toggle_" + name).addClass("building_state_on");
            $("#toggle_" + name).removeClass("building_state_off");
            $("#toggle_" + name).text("On");
        } else {
            $("#toggle_" + name).addClass("building_state_off");
            $("#toggle_" + name).removeClass("building_state_on");
            $("#toggle_" + name).text("Off");
        }
    });
}

function save_to_clip() { /* Put save data in clipboard. Copied from Stack Overflow :) */
    save();
    let save_data = {};
    Object.keys(localStorage).forEach(function (item) {
        save_data[item] = localStorage[item];
    });
    let text = btoa(JSON.stringify(save_data));
    let textArea: any = document.createElement("textarea");

    /* Styling to make sure it doesn't do much if the element gets rendered */

    /* Place in top-left corner of screen regardless of scroll position. */
    textArea.style.position = 'fixed'; textArea.style.top = 0; textArea.style.left = 0; textArea.style.width = '2em'; textArea.style.height = '2em';

    textArea.style.padding = 0; textArea.style.border = 'none'; textArea.style.outline = 'none'; textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent'; textArea.value = text;

    document.body.appendChild(textArea);
    textArea.select();

    try {
        let successful = document.execCommand('copy');
        if (successful) {
            alert("Save copied to clipboard.");
        }
    } catch (err) {
        console.log('Oops, unable to copy');
    }
    document.body.removeChild(textArea);
}

function load_from_clip() {
    let loaded_data = atob(prompt("Paste your save data here."))
    try {
        loaded_data = JSON.parse(loaded_data);

        Object.keys(loaded_data).forEach(function (key) {
            localStorage[key] = loaded_data[key];
        });
    } catch (e){
        /* Using old save probably */
        loaded_data.split(';').forEach(function (data) {
            try {
                let split_data = data.replace(' ', '').split("=");
                localStorage[split_data[0]] = split_data[1]
            } catch (e) {
                console.error(e.message)
            }
        });
    }

    location.reload();
}

function toggle_building_state(name: string) {
    if (buildings[name].on) { /* Turn it off */
        if (name == "s_mana_refinery") { return; /* Can't turn off the refinery */}
        buildings[name].on = false;
        /* Go through each resource it generates... */
        Object.keys(buildings[name].generation).forEach(function (key) {
            /* And decrease production by that much */
            resources_per_sec[key] -= buildings[name].amount * buildings[name].generation[key];
        });
        $("#toggle_" + name).addClass("building_state_off");
        $("#toggle_" + name).removeClass("building_state_on");
        $("#toggle_" + name).text("Off");
    } else { /* Turn it on */
        buildings[name].on = true;
        /* Go through each resource it generates... */
        Object.keys(buildings[name].generation).forEach(function (key) {
            /* And increase production */
            resources_per_sec[key] += buildings[name].amount * buildings[name].generation[key];
        });
        $("#toggle_" + name).addClass("building_state_on");
        $("#toggle_" + name).removeClass("building_state_off");
        $("#toggle_" + name).text("On");
    }
}

var time_on = false;
function toggle_time() {
    time_on = !time_on
    $("#time_toggle").html((time_on ? "Slow" : "Speed") + " time");
}
var last_update: number = Date.now();
function update() {
    /* Find time since last update. */
    let delta_time: number = Date.now() - last_update;
    last_update = Date.now();

    if (delta_time > 15000) { /* More than 15 sec between tics and it's offline gen time. */
        resources["time"].amount += delta_time / 1000; /* 1 sec of production, rest goes to time. */
        return;
    }

    if (time_on) {
        /* Find how much time they will use up */
        if (resources["time"].amount < 10) { /* Not enough for a full addition to the tick. */
            delta_time += resources["time"].amount * 1000; /* Give extra production for however much they can get, and remove that much time. */
            toggle_time();
            $("#time").addClass("hidden");
            resources["time"].amount = 0;
        } else { /* Add 10s of production to this tick and remove the time. */
            delta_time += 10000;
            resources["time"].amount -= 10;
        }
    }

    /* Check for negative resources or resources that will run out. */
    Object.keys(resources).forEach(function (res) { /* Loop through all resources, res is current checked resource */
        if (resources[res].amount > 0) {
            /* Unhide resources we have */
            $("#" + res).removeClass("hidden");
        }
        if (resources[res].amount < -resources_per_sec[res] * delta_time / 1000) {
            /* Check all buildings */
            Object.keys(buildings).forEach(function (build) { /* Loop through all buildings, build is current checked building */
                /* Check resource gen */
                if (buildings[build].generation[res] < 0 && buildings[build].on && buildings[build].amount > 0) {
                    toggle_building_state(build);
                }
            });
        }
    });

    /* Perform spell actions */
    SPELL_BUILDINGS.forEach(function (build) {
        if (buildings[build].on) {
            spell_funcs[buildings[build].update](delta_time);
        }
    });


    /* Update all resources */
    Object.keys(resources).forEach(function (key) {
        if (resources[key].value != 0) {
            /* Don't add special resources */
            resources[key].amount += resources_per_sec[key] * delta_time / 1000;
        } else { /* We have as much of specialty resources as we generate */
            resources[key].amount = resources_per_sec[key];
        }
        /* Formats it so that it says "Resource name: amount" */
        $("#" + key + " span").first().html((key.charAt(0).toUpperCase() + key.slice(1)).replace("_", " ") + ": " + format_num(Math.max(0, resources[key].amount), false));
        /* Same for per sec */
        $("#" + key + "_per_sec").text((resources_per_sec[key] > 0 ? "+" : "") + format_num(resources_per_sec[key]) + "/s");
        /* Color per sec. Hide if super small. */
        if (resources_per_sec[key] < -0.0001) {
            $("#" + key + "_per_sec").css("color", "red");
        } else if (resources_per_sec[key] > 0.0001) {
            $("#" + key + "_per_sec").css("color", "");
        } else {
            $("#" + key + "_per_sec").text("");
        }
    });

    /* Unhide buildings */
    Object.keys(buildings).forEach(function (build) {
        if (SPELL_BUILDINGS.indexOf(build) == -1) {
            $('#building_' + build + " > .tooltiptext").html(gen_building_tooltip(build)); /* Generate tooltip for it. */
        }
        if (buildings[build].amount > 0 && SPELL_BUILDINGS.indexOf(build) == -1) {
            $("#building_" + build).parent().removeClass("hidden"); /* Any owned building is unlocked. Needed in case they sell previous ones and reload. */
            UNLOCK_TREE[build].forEach(function (unlock) {
                $("#building_" + unlock).parent().removeClass("hidden");
            });
        }

        try {
            let amount = parseInt($("#buy_amount").val());
            if (isNaN(amount)) { amount = 1; }
            Object.keys(buildings[build].base_cost).forEach(function (key) {
                let cost = buildings[build].base_cost[key] * Math.pow(buildings[build].price_ratio[key], buildings[build].amount) * (1 - Math.pow(buildings[build].price_ratio[key], amount)) / (1 - buildings[build].price_ratio[key]);
                if (cost > resources[key].amount) {
                    throw Error("Not enough resources!");
                }
            });
            $("#building_" + build).removeClass("building_expensive");
        } catch (e) {
            $("#building_" + build).addClass("building_expensive");
        }
    });
}

/* Not in update as this could change a lot if they have too many unpurchased upgrades. */
function update_upgrade_list() {
    /* Remove old upgrade list */
    let new_list: string = "";
    /* Loop through all remaining upgrades */
    Object.keys(remaining_upgrades).forEach(function (upg_name) {
        if (remaining_upgrades[upg_name].unlock()) {
            let color = "default"; /* Set color to lightgray or red depending on if they can afford it */
            Object.keys(remaining_upgrades[upg_name].cost).forEach(function (res) {
                if (resources[res].amount < remaining_upgrades[upg_name].cost[res]) {
                    color = "red";
                }
            });
            let upg_elem: string = "<li id=\"upgrade_" + upg_name +
                "\" class=\"upgrade tooltip fgc bgc_second\" onclick=\"purchase_upgrade('" + upg_name + "')\" style='text-align: center; color: " + color + "'><span>" +
                remaining_upgrades[upg_name].name + "<br /> <img src='images/" + remaining_upgrades[upg_name].image + "' alt='' style='width: 3em; height: 3em; float: bottom;' /></span><span class=\"tooltiptext fgc bgc_second\" style='opacity: 1;'>" +
                remaining_upgrades[upg_name].tooltip + "</span> </li>";
            new_list += upg_elem;
        }
    });
    $("#upgrades > ul").html(new_list);

}

function update_total_upgrades(name: string) {
    /* Update upgrade total */
    $("#num_upgrades").html("Upgrades: " + purchased_upgrades.length.toString());
    /* Update tooltip list of purchased upgrades */
    $("#purchased_upgrades").append("<br />" + name.replace("<br />", ""));

}

function gen_building_tooltip(name: string) {
    let amount = parseInt($("#buy_amount").val());
    if (isNaN(amount)) { amount = 1; }

    let gen_text: string = "Generates ";
    /* Add resource gen, update how much each one generates. */
    Object.keys(buildings[name].generation).forEach(function (key) {
        if (resources[key].value) { /* Add X per second for regular resources */
            gen_text += format_num(buildings[name].generation[key]) + " " + key.replace("_", " ") + " per second, "
        } else {
            gen_text +=format_num(buildings[name].generation[key]) + " " + key.replace("_", " ") + ", "
        }
    });

    let cost_text: string = "Costs ";
    Object.keys(buildings[name].base_cost).forEach(function (key) {
        /* Total cost for a buy all. Uses a nice summation formula. */
        let cost = buildings[name].base_cost[key] * Math.pow(buildings[name].price_ratio[key], buildings[name].amount) * (1 - Math.pow(buildings[name].price_ratio[key], amount) ) / (1 - buildings[name].price_ratio[key]);
        if (cost > resources[key].amount) {
            cost_text += "<span style='color: red'>"
        } else {
            cost_text += "<span>"
        }
        cost_text += format_num(cost, false) + " " + key.replace("_", " ") + "</span>, ";
    });
    if (cost_text == "Costs ") { cost_text = "Unbuyable,"; } /* Free buildings don't have a cost. */
    let flavor_text: string = "<hr><i style='font-size: small'>" + buildings[name].flavor + "</i>";
    if (buildings[name].flavor == undefined || buildings[name].flavor == "") {
        flavor_text = "";
    }
    return gen_text.trim().replace(/.$/, ".") + "<br />" + cost_text.trim().replace(/.$/, ".") + flavor_text;
}

function purchase_building(name: string) {
    let amount = parseInt($("#buy_amount").val());
    if (isNaN(amount)) { amount = 1; }
    /* Make sure they have enough to buy it */
    Object.keys(buildings[name].base_cost).forEach(function (key) {
        console.log("Checking money");
        let cost = buildings[name].base_cost[key] * Math.pow(buildings[name].price_ratio[key], buildings[name].amount) * (1 - Math.pow(buildings[name].price_ratio[key], amount)) / (1 - buildings[name].price_ratio[key]);

        if (cost > resources[key].amount) {
            add_log_elem("You can't afford that. Missing: " + key.replace("_", " "));
            throw Error("Not enough resources!");
        }
    });

    /* Spend money to buy */
    Object.keys(buildings[name].base_cost).forEach(function (key) {
        console.log("Spending money");
        let cost = buildings[name].base_cost[key] * Math.pow(buildings[name].price_ratio[key], buildings[name].amount) * (1 - Math.pow(buildings[name].price_ratio[key], amount)) / (1 - buildings[name].price_ratio[key]);
        resources[key].amount -= cost;
    });

    /* Add resource gen */
    Object.keys(buildings[name].generation).forEach(function (key) {
        if (buildings[name].on) { /* Only add resources per sec if on */
            resources_per_sec[key] += buildings[name].generation[key] * amount;
        }
    });

    buildings[name].amount += amount;
    $('#building_' + name + " > .building_amount").html(buildings[name].amount.toString());

}

function destroy_building(name: string) {
    let amount = parseInt($("#buy_amount").val());
    if (isNaN(amount)) { amount = 1; }
    for (let i = 0; i < amount; i++) {
        if (buildings[name].amount <= 1) {
            add_log_elem("You can't destroy your last building.");
            return; /* Can't sell last building */
        }
        /* Remove resource gen */
        Object.keys(buildings[name].generation).forEach(function (key) {
            if (buildings[name].on) { /* Only add resources per sec if on */
                resources_per_sec[key] -= buildings[name].generation[key];
            }
        });
        /* Refund resources a bit. Get 30% back. */
        Object.keys(buildings[name].base_cost).forEach(function (key) {
            resources[key].amount += 0.3 * buildings[name].base_cost[key] * Math.pow(buildings[name].price_ratio[key], buildings[name].amount - 1);
        });

        buildings[name].amount--;
        $('#building_' + name + " > .building_amount").html(buildings[name].amount.toString());
    }

}

function purchase_upgrade(name: string) {
    let upg = remaining_upgrades[name];

    /* Check that they have enough */
    Object.keys(upg.cost).forEach(function (resource) {
        if (resources[resource].amount < upg.cost[resource]) { /* Don't have enough to buy upgrade */
            add_log_elem("Not enough resources! Missing: " + resource.replace("_", " "));
            throw Error("Not enough resources!");
        }
    });

    /* Spend it */
    Object.keys(upg.cost).forEach(function (resource) {
        resources[resource].amount -= upg.cost[resource];
    });

    /* Do cleanup. Get benefit from having it, remove it from purchasable upgrades, add it to purchased upgrades, remove from page */
    purchased_upgrades.push(name);
    let upg_name = remaining_upgrades[name].name;
    delete remaining_upgrades[name]
    if (name != "trade") {
        update_total_upgrades(upg_name);
    }
    $("#upgrade_" + name).remove();
    upg.purchase();
}

function random_title() {
    const TITLES = [
        "CrappyIdle v.π²",
        "Drink Your Ovaltine!",
        "(!) Not Responding (I lied)",
        "17 New Resources That Will Blow Your Mind!",
        "Ÿ̛̦̯ͬ̔̾̃ͥ͑o͋ͩ̽̓͋̚͘u͚̼̜̞͉͓̹ͦ͒͌̀ ̄͋̉̓҉̖̖̠̤ņ͔̄͟͟e̦̝̻̼̖͖͋̓̔̓͒ͬe̷͈̗̻̘̩̙̖͗ͫͭͮ͌̃́ͬ̔d̥̞ͨ̏͗͆̉ͩ ̨̟̭̻͔̰͓͍̤͍̀ͤͤ̎͐͘͠m͙͈͖̱͍̖̤͑̃͐͋ͪ̐ͯ̏͘ͅȍ̼̭̦͚̥̜͉̥̱ͬ͞r̥̣̰͈̻̰ͮ̓̚e̳͊ͯ͞ ̏ͯ̈́҉̛̮͚̖͈̼g̩͖̙̞̮̟̍ͦͫ̓ͭͥ̀o̧̻̞̰͉̤͇̭̘͓ͨ̆̔ͨl̴͕͉̦̩̟̤̰̃͋̃̉̓͌ͪ͌ͩd̢̨̲̻̿ͫ",
        "Help im trapped in an html factory",
        "This title dedicated to /u/GitFlucked who really didn't like the previous one.",
        "Try Foodbits! They're super tasty*! *ᴾᵃʳᵗ ᵒᶠ ᵃ ᶜᵒᵐᵖˡᵉᵗᵉ ᵇʳᵉᵃᵏᶠᵃˢᵗ⋅ ᴺᵒᵗ ᶠᵒʳ ʰᵘᵐᵃⁿ ᶜᵒⁿˢᵘᵐᵖᵗᶦᵒⁿ⋅ ᴰᵒ ⁿᵒᵗ ᶜᵒⁿˢᵘᵐᵉ ʷʰᶦˡᵉ ᵘⁿᵈᵉʳ ᵗʰᵉ ᶦⁿᶠˡᵘᵉⁿᶜᵉ ᵒᶠ ᵈʳᵘᵍˢ ᵒʳ ᵃˡᶜᵒʰᵒˡ⋅ ᴼʳ ᵃᶦʳ⋅",
        "BUY ME MORE JEWELRY!",
        "Beware the space squid",

    ];
    document.title = TITLES.filter(item => item !== document.title)[Math.floor(Math.random() * (TITLES.length - 1))];

}

function change_theme(new_theme: string) {
    let themes = {
        "light": ".bgc {background-color: white;}.fgc {color: black;}.bgc_second {background-color: #CCC;}",
        "dark": ".bgc {background-color: black;}.fgc {color: lightgray;}.bgc_second {background-color: #333;}"
    };
    if (themes[new_theme]) {
        $("#color_theme").html(themes[new_theme]);
        localStorage["theme"] = new_theme;
    }
}
window.onload = () => {
    set_initial_state();
    load();
    setInterval(update, 35);
    setInterval(save, 30000);

    update_upgrade_list();
    setInterval(update_upgrade_list, 500);

    random_title();
    setInterval(random_title, 600000);

    SPELL_BUILDINGS.forEach(function (build) {
        if (buildings["s_manastone"].amount * 2 < buildings[build].amount * -buildings[build].generation["mana"]) {
            $("#building_" + build).parent().addClass("hidden");
        }
    });
    /* Start our event system */
    setTimeout(handle_event, 2 * 60000 + Math.random() * 60000 * 2);

    /* Set up for adventure mode requests */
    $.ajaxSetup({
        "async": false,
        "cache": true,
    });
};

function hack(level: number) {
    add_log_elem("You cheater :(");
    Object.keys(resources).forEach(function (r) { resources[r].amount = level });
}
function superhack(level: number) {
    add_log_elem("You filthy cheater :(. You make me sad.");
    Object.keys(resources).forEach(function (r) { resources_per_sec[r] = level });
}