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
import Hardware from "@chrysalis-api/hardware";
import fs from "fs";
import usb from "usb";
import Electron from "electron";

export default class FlashRaise {
  constructor(port, filename, device) {
    this.backupFileName = null;
    this.backupFileData = {
      backup: {},
      log: ["neuron detected"],
      serialNumber: device.serialNumber,
      firmwareFile: filename
    };
  }

  formatedDate() {
    const date = new Date();
    const firstFind = /, /gi;
    const secondFind = /:/gi;
    const formatterDate = date
      .toLocaleString("en-CA", { hour12: false })
      .replace(firstFind, "-")
      .replace(secondFind, "_");
    return formatterDate;
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
    const dir = "./static/backup/";
    this.backupFileName = `${dir}Raise-backup-${this.formatedDate()}.json`;

    try {
      for (let command of commands) {
        let res = await focus.command(command);
        if (res && res !== "") {
          this.backupFileData.backup[command] = res;
        } else {
          throw Error(
            "Firmware update failed, because the settings could not be saved"
          );
        }
      }
    } catch (e) {
      this.backupFileData.log.push(e.message);
      this.saveBackupFile();
      throw e;
    }
  }

  saveBackupFile() {
    let fileName = Electron.remote.dialog.showSaveDialog({
      title: "Save backup file",
      defaultPath: this.backupFileName,
      buttonLabel: "Save backup file",
      filters: [{ name: "json", extensions: ["json"] }]
    });

    fs.writeFile(fileName, JSON.stringify(this.backupFileData), err => {
      if (err) throw err;
      console.log("Log file is created successfully.");
    });
  }

  async resetKeyboard(port) {
    const delay = ms => new Promise(res => setTimeout(res, ms));
    let timeouts = 2000;
    return new Promise((resolve, reject) => {
      port.update({ baudRate: 1200 }, async () => {
        await delay(timeouts);
        console.log("boud change");
        port.close();
        console.log("port after close", port);
        await delay(timeouts);
        const devices = usb
          .getDeviceList()
          .map(device => device.deviceDescriptor);
        devices.forEach(desc => {
          Hardware.nonSerial.forEach(device => {
            if (
              desc.idVendor == device.usb.vendorId &&
              desc.idProduct == device.usb.productId
            ) {
              console.log("device", device);
              resolve();
            }
          });
        });
      });
    });
  }
}
