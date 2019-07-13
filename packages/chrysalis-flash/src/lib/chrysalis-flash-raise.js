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
 * @param {object} port - serial port object for the `path`
 * @param {object} device - device data from SerailPort.list()
 * @property {object} backupFileData Object with settings from raise keyboard EEPROM, logging data, keyboard serial number and file with firmware
 * @emits backupSettings
 * @emits resetKeyboard
 * @emits updateFirmware
 */
export default class FlashRaise {
  constructor(port, device) {
    this.port = port;
    this.path = port.path;
    this.device = device.device;
    this.bootloaderPort = null;
    this.keyboardPort = null;
    this.backupFileName = null;
    this.backupFileData = {
      backup: {},
      log: ["neuron detected"],
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
   * @param {object} findDevice - Device that found (keyboard bootloader or keyboard).
   * @returns {boolean} if device found - true, if no - false
   */
  async foundDevices(hardware, message, findDevice) {
    let focus = new Focus();
    let isFindDevice = false;
    await focus.find(...hardware).then(devices => {
      for (const device of devices) {
        if (this.device.info.keyboardType == device.device.info.keyboardType) {
          this.backupFileData.log.push(message);
          findDevice = { ...device };
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
      this.backupFileData.log.push(`Settings backed up OK`);
    } catch (e) {
      this.saveBackupFile();
      throw e;
    }
  }

  /**
   * Saves backup file in directory what user selected. If user click "Close" button in save dialog, nothing will happen.
   */
  saveBackupFile() {
    let fileName = Electron.remote.dialog.showSaveDialog({
      title: "Save backup file",
      defaultPath: this.backupFileName,
      buttonLabel: "Save backup file",
      filters: [{ name: "json", extensions: ["json"] }]
    });

    if (fileName)
      fs.writeFile(fileName, JSON.stringify(this.backupFileData), err => {
        if (err) throw err;
        console.log("Log file is created successfully.");
      });
  }

   /**
   * Resets keyboard at the baud rate of 1200bps. Keyboard is restarted with the bootloader
   * @param {object} port - serial port object for the `path`.
   * @returns {promise} 
   */
  async resetKeyboard(port) {
    let focus = new Focus();
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
        await this.delay(timeouts.dtrToggle);
        port.set({ dtr: true }, async () => {
          console.log("dtr on");
          await this.delay(timeouts.waitingClose);
          port.set({ dtr: false }, async () => {
            this.backupFileData.log.push(`Waiting for bootloader`);
            console.log("dtr off");
            try {
              await this.delay(timeouts.bootLoaderUp);
              console.log("port dtr", port);
              if (
                await this.foundDevices(
                  Hardware.nonSerial,
                  "Bootloader detected",
                  this.bootloaderPort
                )
              ) {
                resolve("findBootloader");
              } else {
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
   * Updates firmware of bootloader (not implemented)
   * @param {object} port - serial port object for the `path`.
   * @param {string} filename - path to file with firmware.
   */
  async updateFirmware(port, filename, device) {
    let focus = new Focus();
    console.log("update1", this.backupFileData);
    console.log("update", port, filename, device);
    const delay = ms => new Promise(res => setTimeout(res, ms));
    await delay(4000);
    return await this.detectKeyboard(port);
  }

  /**
   * Detects keyboard after firmware of bootloader
   */
  async detectKeyboard(port) {
    let focus = new Focus();
    const timeouts = 2000;
    const errorMessage =
      "The firmware update has failed during the flashing process. Please unplug and replug the keyboard and try again";

    //wait until the bootloader serial port disconnects and the keyboard serial port reconnects
    this.delay(timeouts);

    if (
      await this.foundDevices(
        Hardware.serial,
        "Keyboard detected",
        this.keyboardPort
      )
    ) {
      console.log("find keyboard");
      await this.restoreSettings();
    }
    this.delay(timeouts);
    if (
      await this.foundDevices(
        Hardware.serial,
        "Keyboard detected",
        this.keyboardPort
      )
    ) {
      console.log("find keyboard");
      await this.restoreSettings();
    } else {
      throw new Error(errorMessage);
    }
  }

  /**
   * Restores settings to keyboard after bootloader flashing
   */
  async restoreSettings() {
    let focus = new Focus();
    try {
      await focus.open(
        this.keyboardPort.comName,
        this.keyboardPort.device.info
      );
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
