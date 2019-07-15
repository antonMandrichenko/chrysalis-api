/* chrysalis-hardware-dygma-raise -- Chrysalis support for Dygma Raise
 * Copyright (C) 2018-2019  Keyboardio, Inc.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import KeymapANSI from "./components/Keymap-ANSI";
import Focus from "@chrysalis-api/focus";

const Raise_ANSI = {
  info: {
    vendor: "Dygma",
    product: "Raise",
    keyboardType: "ANSI",
    displayName: "Dygma Raise ANSI",
    urls: [
      {
        name: "Homepage",
        url: "https://www.dygma.com/raise/"
      }
    ]
  },
  usb: {
    vendorId: 0x1209,
    productId: 0x2201
  },
  keyboard: {
    rows: 5,
    columns: 16
  },
  components: {
    keymap: KeymapANSI
  },

  instructions: {
    en: {
      updateInstructions: `To update the firmware, the keyboard needs a special reset. When you see the light on the Neuron go off, press and hold the Escape key. The Neuron's light should start a blue pulsing pattern`
    },
    hu: {
      updateInstructions: `not translate`
    }
  },

  flash: async (port, filename, device, flashRaise) => {
    return new Promise(async (resolve, reject) => {
      try {
        await flashRaise.updateFirmware(port, filename, device);
        flashRaise.saveBackupFile();
        resolve();
      } catch (e) {
        flashRaise.saveBackupFile();
        reject(e);
      }
    });
  },

  isDeviceSupported: async port => {
    let focus = new Focus();
    await focus.open(port.comName);
    const layout = await focus.command("hardware.layout");
    focus.close();
    return layout.trim() === "ANSI" ? true : false;
  }
};

const Raise_ANSIBootloader = {
  info: {
    vendor: "Dygma",
    product: "Raise",
    keyboardType: "ANSI",
    displayName: "Dygma Raise ANSI",
    urls: [
      {
        name: "Homepage",
        url: "https://www.dygma.com/raise/"
      }
    ]
  },
  usb: {
    vendorId: 0x1209,
    productId: 0x2200
  },

  flash: async (port, filename, device, flashRaise) => {
    return new Promise(async (resolve, reject) => {
      try {
        await flashRaise.updateFirmware(port, filename, device);
        flashRaise.saveBackupFile();
        resolve();
      } catch (e) {
        flashRaise.saveBackupFile();
        reject(e);
      }
    });
  }
};

export { Raise_ANSI, Raise_ANSIBootloader };
