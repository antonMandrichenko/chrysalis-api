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
import Electron from "electron";
import Focus from "@chrysalis-api/focus";
import Hardware from "@chrysalis-api/hardware";

/**
 * Create a new flash raise object.
 * @class FlashRaise
 * @param {object} port - serial port object for the "path"
 * @param {object} device - device data from SerailPort.list()
 * @property {object} backupFileData Object with settings from raise keyboard EEPROM, logging data, keyboard serial number and file with firmware
 * @emits backupSettings
 * @emits resetKeyboard
 * @emits updateFirmware
 */
export default class FlashRaise {
  constructor(port, device) {
    this.device = device.device;
    this.currentPort = null;
    this.backupFileName = null;
    this.backupFileData = {
      backup: {},
      log: ["Neuron detected"],
      serialNumber: device.serialNumber,
      firmwareFile: null
    };
    this.delay = ms => new Promise(res => setTimeout(res, ms));
  }

  /**
   * Formats date for create name of backup file.
   * @returns {string} formate date for example "2019-07-12-19_40_56"
   */
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

  /**
   * Founds device what connected from Chrysalis Hardware api.
   * @param {array} hardware - Array of supported devices by Chrysalis api.
   * @param {string} message - Message for backup file.
   * @returns {boolean} if device found - true, if no - false
   */
  async foundDevices(hardware, message) {
    let focus = new Focus();
    let isFindDevice = false;
    await focus.find(...hardware).then(devices => {
      for (const device of devices) {
        if (this.device.info.keyboardType == device.device.info.keyboardType) {
          this.backupFileData.log.push(message);
          this.currentPort = { ...device };
          isFindDevice = true;
        }
      }
    });
    return isFindDevice ? true : false;
  }

  /**
   * Takes backup settings from keyboard and writes its in backupfile.
   */
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
      this.backupFileData.log.push("Settings backed up OK");
    } catch (e) {
      this.saveBackupFile();
      throw e;
    }
  }

  /**
   * Saves backup file in directory, what user selected. If user click "Close" button in save dialog, nothing will happen.
   */
  saveBackupFile() {
    let fileName = Electron.remote.dialog.showSaveDialog({
      title: "Save backup file",
      defaultPath: this.backupFileName,
      buttonLabel: "Save backup file",
      filters: [{ name: "json", extensions: ["json"] }]
    });

    if (fileName) {
      fs.writeFile(fileName, JSON.stringify(this.backupFileData), err => {
        if (err) throw err;
        this.backupFileData.log.push("Backup file is created successfully");
        console.log("Backup file is created successfully");
      });
    } else {
      this.backupFileData.log.push("Backup file is not created");
      console.log("Backup file is not created");
    }
  }

  /**
   * Resets keyboard at the baud rate of 1200bps. Keyboard is restarted with the bootloader
   * @param {object} port - serial port object for the "path".
   * @returns {promise}
   */
  async resetKeyboard(port) {
    const errorMessage =
      "The Raise bootloader wasn't found. Please try again, make sure you press and hold the Escape key when the Neuron light goes out";
    let timeouts = {
      dtrToggle: 250, // Time to wait (ms) between toggling DTR
      waitingClose: 2750, // Time to wait for boot loader
      bootLoaderUp: 2000 // Time to wait for the boot loader to come up
    };
    return new Promise((resolve, reject) => {
      port.update({ baudRate: 1200 }, async () => {
        this.backupFileData.log.push("Resetting neuron");
        console.log("baud update");
        await this.delay(timeouts.dtrToggle);
        port.set({ dtr: true }, async () => {
          console.log("dtr on");
          await this.delay(timeouts.waitingClose);
          port.set({ dtr: false }, async () => {
            this.backupFileData.log.push("Waiting for bootloader");
            console.log("dtr off");
            try {
              await this.delay(timeouts.bootLoaderUp);
              if (
                await this.foundDevices(
                  Hardware.nonSerial,
                  "Bootloader detected"
                )
              ) {
                resolve();
              } else {
                this.backupFileData.log.push("Bootloader didn't detect");
                throw new Error(errorMessage);
              }
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

  /**
   * Updates firmware of bootloader
   * @param {object} port - serial port object for the "path".
   * @param {string} filename - path to file with firmware.
   * @returns {promise}
   */
  async updateFirmware(_, filename) {
    this.backupFileData.log.push("Begin update firmware with SAM-BA");
    this.backupFileData.firmwareFile = filename;
    return new Promise(async (resolve, reject) => {
      try {
        await this.delay(3000); // time for flash bootloader, not implemented
        await this.detectKeyboard();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Detects keyboard after firmware of bootloader
   */
  async detectKeyboard() {
    const timeouts = 2000;
    const findTimes = 2;
    const errorMessage =
      "The firmware update has failed during the flashing process. Please unplug and replug the keyboard and try again";
    this.backupFileData.log.push("Waiting for keyboard");
    //wait until the bootloader serial port disconnects and the keyboard serial port reconnects
    const findKeyboard = async () => {
      return new Promise(async resolve => {
        this.delay(timeouts);
        if (await this.foundDevices(Hardware.serial, "Keyboard detected")) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    };
    try {
      await this.runnerFindKeyboard(findKeyboard, findTimes, errorMessage);
    } catch (e) {
      this.backupFileData.log.push(`Detect keyboard: Error: ${e.message}`);
      throw e;
    }
  }

  /**
   * Runs the function several times
   * @param {function} findKeyboard - function that will run several times.
   * @param {number} times - how many times function runs.
   * @param {string} errorMessage - error message if error is.
   */
  async runnerFindKeyboard(findKeyboard, times, errorMessage) {
    if (!times) throw new Error(errorMessage);
    if (await findKeyboard()) {
      await this.restoreSettings();
    } else {
      this.backupFileData.log.push(`Keyboard didn't detect ${times} time`);
      await this.runnerFindKeyboard(findKeyboard, times - 1, errorMessage);
    }
  }

  /**
   * Restores settings to keyboard after bootloader flashing
   */
  async restoreSettings() {
    let focus = new Focus();
    const errorMessage =
        "Firmware update failed, because the settings could not be restore";
    return new Promise(async (resolve, reject) => {
      try {
        await focus.open(
          this.currentPort.comName,
          this.currentPort.device.info
        );
        if (focus.isOpen) {
          const commands = Object.keys(this.backupFileData.backup);
          let errorFlag = false;
          for (let command of commands) {
            let data = await focus.command(
              command,
              this.backupFileData.backup[command]
            );
            if (!data) {
              this.backupFileData.log.push(
                `Restore backup settings ${command}: Error: ${errorMessage}`
              );
              errorFlag = true;
            }
          }
          if (errorFlag) throw new Error(errorMessage);
          this.backupFileData.log.push("Restoring all settings");
          this.backupFileData.log.push("Firmware update OK");
          resolve();
        } else {
          throw new Error("Port is not open after ");
        }
      } catch (e) {
        this.backupFileData.log.push(`Restore settings: Error: ${e.message}`);
        reject(e);
      }
    });
  }
}
