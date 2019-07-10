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

import fs from "fs";
import usb from "usb";
import Electron from "electron";
import Focus from "@chrysalis-api/focus";
import Hardware from "@chrysalis-api/hardware";

export default class FlashRaise {
  constructor(port, device) {
    this.port = port;
    this.device = device.device;
    this.bootloader = null;
    this.backupFileName = null;
    this.backupFileData = {
      backup: {},
      log: ["neuron detected"],
      serialNumber: device.serialNumber,
      firmwareFile: null
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
      if (errorFlag) throw new Error(errorMessage);
      this.backupFileData.log.push(`Settings backed up OK`);
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

  async resetKeyboard(port) {
    let focus = new Focus();
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const errorMessage =
      "The Raise bootloader wasn't found. Please try again, make sure you press and hold the Escape key when the Neuron light goes out";
    let timeouts = {
      dtrToggle: 250, // Time to wait (ms) between toggling DTR
      waitingClose: 2750, // Time to wait for boot loader
      bootLoaderUp: 2000 // Time to wait for the boot loader to come up
    };
    return new Promise((resolve, reject) => {
      port.update({ baudRate: 1200 }, async () => {
        this.backupFileData.log.push(`Resetting neuron`);
        console.log("baud update");
        await delay(timeouts.dtrToggle);
        port.set({ dtr: true }, async () => {
          console.log("dtr on");
          await delay(timeouts.waitingClose);
          port.set({ dtr: false }, async () => {
            this.backupFileData.log.push(`Waiting for bootloader`);
            console.log("dtr off");
            try {
              await delay(timeouts.bootLoaderUp);
              console.log("port dtr", port);
              let deviceFind = false;
              await focus.find(...Hardware.nonSerial).then(devices => {
                for (const device of devices) {
                  if (
                    this.device.info.keyboardType ==
                    device.device.info.keyboardType
                  ) {
                    this.backupFileData.log.push(`Bootloader detected`);
                    deviceFind = true;
                    this.bootloader = { ...device };
                    resolve("findBootloader");
                  }
                }
              });
              if (!deviceFind) throw new Error(errorMessage);
            } catch (e) {
              this.backupFileData.log.push(
                `Reset keyboard: Error: ${e.message}`
              );
              this.saveBackupFile();
              reject(e);
            }
          });
        });
      });
    });
  }

  async updateFirmware(port, filename, device) {
    console.log("update1", this.backupFileData);
    console.log("update", port, filename, device);
    const delay = ms => new Promise(res => setTimeout(res, ms));
    return await delay(4000);
  }

  async restoreSettings() {
    let focus = new Focus();
    try {
      await focus.open(this.port, this.device.info);
      const commands = Object.keys(this.backupFileData.backup);
      for (let command of commands) {
        await focus.command(command, this.backupFileData.backup[command]);
      }
      this.backupFileData.log.push(`Restoring all settings`);
    } catch (e) {
      this.backupFileData.log.push(`Restore settings: Error: ${e.message}`);
      this.saveBackupFile();
    }
  }
}
