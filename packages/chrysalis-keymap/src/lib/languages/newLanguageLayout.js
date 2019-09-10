/* chrysalis-keymap -- Chrysalis keymap library
 * Copyright (C) 2018  Keyboardio, Inc.
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



/**
   * Is a JavaScript function that change language layout
   * @param {Array} baseKeyCodeTable Default language layout
   * @param {Array} currentLayer Array of objects of values that have to be modified
   */


function newLanguageLayout(baseKeyCodeTable, language = "english") {
  if (language === "english") {
    return baseKeyCodeTable;
  } else {
    return baseKeyCodeTable.map(groupe => {
      const newArray = groupe.keys.reduce((acc, key) => {
        const newKey = language.find(item => item.code === key.code);
        if (newKey) {
          acc.push(newKey);
        } else {
          acc.push(key);
        }
        return acc;
      }, []);

      return {
        ...groupe,
        keys: newArray
      };
    });
  }
}

export default newLanguageLayout;
