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
  constructor(port, device) {
    this.port = port;
    this.backupFileName = null;
    this.backupFileData = {
      backup: {},
      log: ["neuron detected"],
      serialNumber: device.serialNumber,
      firmwareFile: null
    };
  }

  async init() {
    try {
      // await this.backupSettings();
      await this.resetKeyboard(this.port);
    } catch (e) {
      throw e;
    } finally {
      this.saveBackupFile();
    }
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
    this.backupFileName = `Raise-backup-${this.formatedDate()}.json`;

    try {
      let errorFlag = false;
      const errorMessage =
        "Firmware update failed, because the settings could not be saved";
      for (let command of commands) {
        let res = await focus.command(command);
        this.backupFileData.backup[command] = res;
        if (!res || res === "") {
          this.backupFileData.log.push(
            `Get backup settings ${command}: Error: ${errorMessage}`
          );
          errorFlag = true;
        }
      }
      if (errorFlag) throw Error(errorMessage);
    } catch (e) {
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

  createDialog() {
    return `<div>My name is Anton</div>`;
  }

  async resetKeyboard(port) {
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const errorMessage =
      "The Raise bootloader wasn't found. Please try again, make sure you press and hold the Escape key when the Neuron light goes out";
    let timeouts = 2000;
    return new Promise((resolve, reject) => {
      port.update({ baudRate: 1200 }, async () => {
        await delay(timeouts);
        console.log("boud change");
        port.close();
        console.log("port close");
        await delay(timeouts);
        const devices = usb
          .getDeviceList()
          .map(device => device.deviceDescriptor);

        try {
          devices.forEach(desc => {
            Hardware.nonSerial.forEach(device => {
              if (
                desc.idVendor == device.usb.vendorId &&
                desc.idProduct == device.usb.productId
              ) {
                resolve();
              }
            });
          });
          throw Error(errorMessage);
        } catch (e) {
          this.backupFileData.log.push(`Reset keyboard: Error: ${e.message}`);
          this.saveBackupFile();
          reject(e);
        }
      });
    });
  }
}
