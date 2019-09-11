/* chrysalis-keymap -- Chrysalis keymap library
 * Copyright (C) 2018, 2019  Keyboardio, Inc.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 */

import BlankTable from "./db/blanks"
import LetterTable, { ModifiedLetterTables } from "./db/letters"
import DigitTable, { ModifiedDigitTables } from "./db/digits"
import { LockLayerTable, ShiftToLayerTable } from "./db/layerswitch"
import PunctuationTable, {
    ModifiedPunctuationTables
} from "./db/punctuation"
import SpacingTable, { ModifiedSpacingTables } from "./db/spacing"
import ModifiersTable, {
    ModifiedModifiersTables,
    HyperMehTable
} from "./db/modifiers"
import NavigationTable, {
    ModifiedNavigationTables
} from "./db/navigation"
import LEDEffectsTable from "./db/ledeffects"
import MacrosTable from "./db/macros"
import NumpadTable, {
    ModifiedNumpadTables
} from "./db/numpad"
import FunctionKeyTable, {
    ModifiedFunctionKeyTables
} from "./db/fxs"

import MediaControlTable from "./db/mediacontrols"
import {
    MouseMovementTable,
    MouseWheelTable,
    MouseButtonTable,
    MouseWarpTable
} from "./db/mousecontrols"
import MiscellaneousTable from "./db/miscellaneous"

import { OneShotModifierTable, OneShotLayerTable } from "./db/oneshot"
import { DualUseModifierTables, DualUseLayerTables } from "./db/dualuse"
import TapDanceTable from "./db/tapdance"
import LeaderTable from "./db/leader"
import StenoTable from "./db/steno"
import SpaceCadetTable from "./db/spacecadet"

// Spanish - is an Array of objects of values that have to be modified
import spanish from "./languages/spanish/spanish";

// newLanguageLayout - is a function that modify language layout
import newLanguageLayout from "./languages/newLanguageLayout";

const defaultBaseKeyCodeTable = [
    LetterTable,
    DigitTable,
    PunctuationTable,
    SpacingTable,
    ModifiersTable,
    NavigationTable,
    FunctionKeyTable,
    NumpadTable,
    MiscellaneousTable,

    ShiftToLayerTable,
    LockLayerTable,

    LEDEffectsTable,
    MacrosTable,
    MediaControlTable,
    MouseMovementTable,
    MouseButtonTable,
    MouseWheelTable,
    MouseWarpTable,

    OneShotModifierTable,
    OneShotLayerTable,
    TapDanceTable,
    LeaderTable,
    StenoTable,
    SpaceCadetTable,

    BlankTable
]
const defaultKeyCodeTable = defaultBaseKeyCodeTable
    .concat(ModifiedLetterTables)
    .concat(ModifiedDigitTables)
    .concat(ModifiedPunctuationTables)
    .concat(ModifiedSpacingTables)
    .concat(ModifiedNavigationTables)
    .concat(ModifiedModifiersTables)
    .concat(HyperMehTable)
    .concat(ModifiedFunctionKeyTables)
    .concat(ModifiedNumpadTables)
    .concat(DualUseModifierTables)
    .concat(DualUseLayerTables)

// DataBase of languages 
const languagesDB = {
    english: "english",
    spanish
  }; 

let baseKeyCodeTable, keyCodeTable;

class KeymapDB {
    constructor() {
        this.keymapCodeTable = []
        //create variable that get language from the local storage
        this.language = localStorage.getItem("language") || "english";

        //Modify our baseKeyCodeTable, depending on the language selected through function newLanguageLayout
        baseKeyCodeTable = newLanguageLayout(
            defaultBaseKeyCodeTable,
            this.language,
            languagesDB[this.language]
        );
        //Modify our baseKeyCodeTable, depending on the language selected through function newLanguageLayout
        keyCodeTable = baseKeyCodeTable.concat(newLanguageLayout(
            defaultKeyCodeTable.slice(defaultBaseKeyCodeTable.length),
            this.language,
            languagesDB[this.language]
        ));

        for (let group of keyCodeTable) {
            for (let key of group.keys) {
                let value

                if (key.labels) {
                    value = key
                } else {
                    value = {
                        code: key.code,
                        labels: {
                            primary: "#" + key.code.toString()
                        }
                    }
                }

                this.keymapCodeTable[key.code] = value
            }
        }
    }

    parse(keyCode) {
        let key

        if (!keyCode) keyCode = 0

        if (keyCode < this.keymapCodeTable.length) {
            key = this.keymapCodeTable[keyCode]
        }

        if (!key) {
            key = {
                code: keyCode,
                labels: {
                    primary: "#" + keyCode.toString()
                }
            }
        }

        return {
            keyCode: key.code,
            label: key.labels.primary,
            extraLabel: key.labels.top,
            verbose: key.labels.verbose
        }
    }

    serialize(key) {
        return key.keyCode
    }
}

export { KeymapDB as default, baseKeyCodeTable, keyCodeTable, languagesDB }
