/* chrysalis-colormap -- Chrysalis colormap library
 * Copyright (C) 2019  Keyboardio, Inc.
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

import Focus from "@chrysalis-api/focus";
import fs from "fs";

export default class FlashRaise {
  constructor(opts) {
    this.backupFileName = null;
    this.logs = [];
  }

  async backupSettings() {
    let focus = new Focus();
    const commands = [
      "hardware.keyscan",
      "led.mode",
      "keymap.custom",
      "keymap.default",
      "keymap.onlyCustom",
      "led.theme",
      "palette",
      "joint.threshold"
    ];
    let results = {};
    const dir = "./static/backup/";
    const date = new Date();
    let year = date.getFullYear(),
      month = date.getMonth() + 1,
      day = date.getDate(),
      hours = date.getHours(),
      minutes = date.getMinutes(),
      seconds = date.getSeconds();
    const dateInString = `${year}-${month}-${day}-${hours}_${minutes}_${seconds}`;
    this.backupFileName = `${dir}Raise-backup-${dateInString}.json`;

    for (let command of commands) {
      let res = await focus.command(command);
      // if (res && res !== "") {
      results[command] = res;
      // }
    }

    console.log("filename", this.backupFileName);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    fs.writeFile(this.backupFileName, JSON.stringify(results), err => {
      if (err) throw err;
      console.log("File is created successfully.");
    });
  }

  async resetKeyboard() {

  }
}
