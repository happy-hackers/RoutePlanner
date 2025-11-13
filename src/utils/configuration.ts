const key = "settings";

export function getSettingInfo() {
  const settingInfo = localStorage.getItem(key);
  if (settingInfo && settingInfo !== "undefined") {
    const settingJson = JSON.parse(settingInfo);
    return settingJson;
  } else {
    return { startAddress: "", endAddress: "", useDefaultAddress: false };
  }
}

export function updateSettingInfo(values: any) {
  if (values) {
    const originValues = getSettingInfo();
    const newValues = { ...originValues, ...values };
    localStorage.setItem(key, JSON.stringify(newValues));
  }
}
