exports.version = 1.0
exports.apiRequired = 12.94
exports.description = "Allows you to turn on and off VMs through HFS on the host machine"
exports.repo = "W-i-n-7/vmware-ctrl"
exports.preview = ["https://raw.githubusercontent.com/W-i-n-7/vmware-ctrl/refs/heads/main/imgs/image1.png", "https://raw.githubusercontent.com/W-i-n-7/vmware-ctrl/refs/heads/main/imgs/image2.png", "https://raw.githubusercontent.com/W-i-n-7/vmware-ctrl/refs/heads/main/imgs/image3.png"]

exports.customHtml = {
  "userPanelAfterInfo": `
<div id="vmctrl-panel" style="margin: 1em 0; display: flex; gap: 0.5em;">
    <p>VM Control:</p>
    <select id="vmctrl-vmlist" style="flex:1; min-width: 10em;">
        <option>Loading…</option>
    </select>

    <button id="vmctrl-vmStart">Start</button>
    <button id="vmctrl-vmStop">Stop</button>
</div>

<script>
    refresh_vm_list();
    async function refresh_vm_list() {
        const dropdown = document.querySelector("#vmctrl-vmlist");
        const btnStart = document.querySelector("#vmctrl-vmStart");
        const btnStop = document.querySelector("#vmctrl-vmStop");

        if (!dropdown || !btnStart || !btnStop) {
            console.warn("VM panel elements not found in DOM");
            console.log(dropdown);
            console.log(btnStart);
            console.log(btnStop);
            return;
        }

        try {
            const vms = await HFS.customRestCall("get_vms", {});

            if (vms.success == false) {
                document.getElementById("vmctrl-panel").remove();
                return;
            }

            dropdown.innerHTML = "";

            vms.forEach((name, i) => {
                const opt = document.createElement("option");
                opt.value = i;
                opt.textContent = name;
                dropdown.appendChild(opt);
            });
        } catch (err) {
            console.error("getvms error", err);
            dropdown.innerHTML = '<option>Error loading</option>';
        }

        btnStart.onclick = async() => {
            const index = Number(dropdown.value);
            const response = await HFS.customRestCall("vm_ctrl", {
                index,
                on: true
            });
            if (response.success) {
                alert("VM Started!");
            } else {
                alert("An error occurred: " + response.message)
            }
        };

        btnStop.onclick = async() => {
            const index = Number(dropdown.value);
            const response = await HFS.customRestCall("vm_ctrl", {
                index,
                on: false
            });
            if (response.success) {
                alert("VM Stopped");
            } else {
                alert("An error occurred: " + response.message)
            }
        };
    }
</script>
  `
}

exports.config = {
    allowedusers: {
        type: 'username',
        multiple: true,
        label: 'Allowed users'
    },
    vmrun: {
        type: 'real_path',
        files: true,
        folders: false,
        defaultPath: "C:\\Program Files (x86)\\VMware\\VMware Workstation",
        fileMask: 'vmrun.exe',
        label: "Path to vmrun.exe",
        defaultValue: "C:\\Program Files (x86)\\VMware\\VMware Workstation\\vmrun.exe"
    },
    vms: {
      type: 'array',
      label: 'VMs',
      fields: {
        name: {
          type: 'string',
          label: 'Name'
        },
        vmx: {
            type: 'real_path',
            files: true,
            folders: false,
            fileMask: '*.vmx',
            label: "Path to VMX file",
        },
      }
    }
}

exports.init = (api) => {
    const { spawn } = api.require("child_process")
    exports.customRest = {
        vm_ctrl({ index, on }, ctx) { 
            if (!api.ctxBelongsTo(ctx, api.getConfig('allowedusers'))) {
                return { success: false, message: "Forbidden" }
            }

            if (index < 0) {
                return { success: false, message: "Index cannot be less than 0" }
            }

            const vmx = api.getConfig('vms').map(item => item.vmx)

            if (index > vmx.length - 1) {
                return { success: false, message: "This VM does not exist." }
            }

            var startstop = ""
            if (on) startstop = "start"
            else startstop = "stop"
            
            command = api.getConfig('vmrun')
            args = [startstop, vmx[index]]

            const child = spawn(command, args, {
                detached: true,
                stdio: "ignore",
                windowsHide: true,
            })

            child.unref()

            child.on("error", (error) => {
                api.log("Error running file: " + error.message)
                return { success: false, message: "Error" }
            })

            return { success: true, message: "Success" }
        },
        async get_vms({}, ctx) {
            if (!api.ctxBelongsTo(ctx, api.getConfig('allowedusers'))) {
                return { success: false, message: "Forbidden" }
            }

            return api.getConfig('vms').map(item => item.name)
        }
    }
}



