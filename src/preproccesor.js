// test
import "./styles/styles.scss";
import * as XLSX from "xlsx/xlsx.mjs";

import { runPythonScript } from "./proccesor.js";
import { buildChart } from "./postproccesor.js";

const barsHeaderElems = document.querySelectorAll("[data-bars-header]");
const barsTableElem = document.querySelector("[data-bars-table]");
const linearTableElem = document.querySelector("[data-linear-table]");
const pointTableElem = document.querySelector("[data-point-table]");

// TODO: Порефакторить
let RESULT_NX;
let RESULT_UX;
let RESULT_SGX;

const SCHEME_BORDER_WIDTH = 3;

if (barsTableElem.children.length == 0) {
  barsHeaderElems.forEach((elem) => {
    elem.hidden = true;
  });
}

function createRow(className, parent) {
  const rowElem = document.createElement("tr");
  rowElem.className = className;
  parent.appendChild(rowElem);
  return rowElem;
}

function createTitleCell(title, className, parent) {
  const titleCell = document.createElement("th");
  titleCell.className = className;
  titleCell.innerText = title;
  parent.appendChild(titleCell);
  return titleCell;
}

function createContentCell(inputAttributes, className, parent) {
  const contentCell = document.createElement("td");
  contentCell.className = className;
  parent.appendChild(contentCell);

  const inputElem = document.createElement("input");
  inputElem.className = "bars-table__input";
  for (const key in inputAttributes) {
    inputElem.setAttribute(key, inputAttributes[key]);
  }
  contentCell.appendChild(inputElem);

  return contentCell;
}

function addBar() {
  barsHeaderElems.forEach((elem) => {
    elem.hidden = false;
  });

  const index = barsTableElem.children.length + 1;

  const barRowElem = createRow("bars-table__row", barsTableElem);
  createTitleCell(`Стержень ${index}`, "bars-table__title", barRowElem);

  const barAttributes = [
    { id: "length", type: "number", required: "" },
    { id: "area", type: "number", required: "" },
    { id: "elasticity", type: "number", required: "" },
    { id: "voltage", type: "number", required: "" },
  ];

  barAttributes.forEach((attr) =>
    createContentCell(attr, "bars-table__content", barRowElem)
  );

  const linearRowElem = createRow("bars-table__row", linearTableElem);
  createTitleCell(`Стержень ${index}`, "bars-table__title", linearRowElem);

  const linearAttributes = { id: "q", type: "number" };
  createContentCell(linearAttributes, "bars-table__content", linearRowElem);

  if (index === 1) {
    createPointRow(index, "qL", pointTableElem, true);
  }

  createPointRow(index + 1, "qL", pointTableElem, false);
}

function createPointRow(index, id, parent, isRequired) {
  const pointRowElem = createRow("bars-table__row", parent);
  createTitleCell(`Узел ${index}`, "bars-table__title", pointRowElem);

  const pointAttributes = { id, type: "number" };
  if (isRequired) {
    pointAttributes.required = "";
  }
  createContentCell(pointAttributes, "bars-table__content", pointRowElem);
}

function deleteBar() {
  if (barsTableElem.children.length > 0) {
    barsTableElem.removeChild(barsTableElem.lastElementChild);
    linearTableElem.removeChild(linearTableElem.lastElementChild);

    if (pointTableElem.children.length == 2) {
      pointTableElem.removeChild(pointTableElem.lastElementChild);
    }

    pointTableElem.removeChild(pointTableElem.lastElementChild);

    if (barsTableElem.children.length == 0) {
      barsHeaderElems.forEach((elem) => {
        elem.hidden = true;
      });
    }
  } else {
    alert("Не найдены стержни для удаления");
  }
}

const schemeBarListElem = document.querySelector("[data-scheme-list]");

function createConstruction() {
  schemeBarListElem.innerHTML = "";

  function addLinearLoad(linearLoadInputElem, listOfLoads, schemeBarElem) {
    const linearLoadValue = +linearLoadInputElem.value;

    if (linearLoadValue != 0) {
      const schemeLinearLoadElem = document.createElement("div");
      schemeLinearLoadElem.className = "scheme__load";

      let schemeLinearLoadValueElem = document.createElement("span");
      schemeLinearLoadValueElem.innerText = `${linearLoadValue}q`;
      schemeLinearLoadValueElem.className = "scheme__linear-load-value";

      if (linearLoadValue > 0) {
        schemeBarElem.appendChild(schemeLinearLoadElem);
        schemeLinearLoadElem.appendChild(schemeLinearLoadValueElem);
      } else if (linearLoadValue < 0) {
        schemeLinearLoadElem.style.transform = "translate(0, -50%) scaleX(-1)";
        schemeBarElem.appendChild(schemeLinearLoadElem);
        schemeLinearLoadElem.appendChild(schemeLinearLoadValueElem);
        schemeLinearLoadValueElem.style.transform = "scaleX(-1)";
      }
    }
    listOfLoads.push(linearLoadValue);
  }

  function addPointLoad(pointLoadInputElem, schemeBarElem, powers, i) {
    const pointLoadValue = +pointLoadInputElem.value;

    if (i == 0) {
      if (pointLoadValue != 0) {
        const schemePointLoadElem = document.createElement("div");
        schemePointLoadElem.className = "scheme__point-load";

        const schemePointLoadValueElem = document.createElement("span");
        schemePointLoadValueElem.innerText = `${pointLoadValue}qL`;
        schemePointLoadValueElem.className = "scheme__point-load-value";

        schemePointLoadElem.appendChild(schemePointLoadValueElem);

        if (pointLoadValue < 0) {
          schemeBarElem.append(schemePointLoadElem);

          let computedStyles = getComputedStyle(schemeBarElem);
          let translateValuePx = computedStyles.minWidth;
          const translateValue = parseFloat(translateValuePx) - 44;

          schemePointLoadElem.style.transform = `translate(-${translateValue}px, -50%) scaleX(-1)`;
          schemePointLoadValueElem.style.transform = "scaleX(-1)";
          schemePointLoadValueElem.style.justifyContent = "end";
        } else if (pointLoadValue > 0) {
          schemeBarElem.append(schemePointLoadElem);
        }
      }
      powers[i + 1] = pointLoadValue;
    }
  }

  function addNextPointLoad(pointLoadNextInputElem, schemeBarElem, powers, i) {
    const pointLoadNextValue = +pointLoadNextInputElem.value;

    if (pointLoadNextValue != 0) {
      const schemePointLoadElem = document.createElement("div");
      schemePointLoadElem.className = "scheme__point-load";

      const schemePointLoadValueElem = document.createElement("span");
      schemePointLoadValueElem.innerText = `${pointLoadNextValue}qL`;
      schemePointLoadValueElem.className = "scheme__point-load-value";

      schemePointLoadElem.appendChild(schemePointLoadValueElem);
      if (pointLoadNextValue < 0) {
        schemeBarElem.append(schemePointLoadElem);
        schemePointLoadElem.style.transform =
          "translate(41px, -50%) scaleX(-1)";
        schemePointLoadValueElem.style.transform = "scaleX(-1)";
        schemePointLoadValueElem.style.justifyContent = "end";
      } else if (pointLoadNextValue > 0) {
        schemeBarElem.append(schemePointLoadElem);
        // schemePointLoadElem.style.transform = 'translate(101%, -50%)';
        schemePointLoadElem.style.left = `calc(100% + ${SCHEME_BORDER_WIDTH}px)`;
      }
    }
    powers[i + 2] = pointLoadNextValue;
  }

  if (barsTableElem.children.length !== 0) {
    let schemeBarElemMaxHeight = 70;

    let listOfLength = []; //[L-№1, L-№2, ..., L-№ N]
    let listOfWidth = []; //[A-№1, A-№2, ..., A-№ N]
    let listOfYoungModulus = []; //[E-№1, E-№2, ..., E-№ N]
    let listOfSigma = [];
    let listOfLoads = []; //[q-№1, q-№2, ..., q-№ N]
    let powers = {}; //{'1': F-№1, '2': F-№2, ..., 'N': F-№ N, 'N+1': F-№ N+1}
    let leftSealing = false;
    let rightSealing = false;
    let valueX = -1;
    let rodNumber = 1;

    for (let i = 0; i < barsTableElem.children.length; i++) {
      const schemeBarElem = document.createElement("li");
      schemeBarElem.className = "scheme__item";

      let schemeBarLengthValueElem = document.createElement("span");
      schemeBarLengthValueElem.className = "scheme__length-value";

      let schemeBarElastValueElem = document.createElement("span");
      schemeBarElastValueElem.className = "scheme__elasticity-value";

      let schemeBarAreaValueElem = document.createElement("span");
      schemeBarAreaValueElem.className = "scheme__area-value";

      let schemeBarLengthLineElem = document.createElement("div");
      schemeBarLengthLineElem.className = "scheme__length-line";
      schemeBarElem.append(schemeBarLengthLineElem);

      for (let i = 0; i < 2; i++) {
        let schemeBarLengthArrowElem = document.createElement("div");
        schemeBarLengthArrowElem.className = "scheme__length-arrow";
        schemeBarElem.append(schemeBarLengthArrowElem);

        if (i == 1) {
          schemeBarLengthArrowElem.classList.add("scheme__length-arrow--right");
        }
      }

      const currentBar = barsTableElem.children[i];
      let lengthInputElem = currentBar.querySelector("#length");
      let areaInputElem = currentBar.querySelector("#area");
      let elasticityInputElem = currentBar.querySelector("#elasticity");
      let voltageInputElem = currentBar.querySelector("#voltage");
      let schemeBarElemHeight = 70;

      const lengthValue = +lengthInputElem.value;
      const areaValue = +areaInputElem.value;
      const elastValue = +elasticityInputElem.value;
      const sigmaValue = +voltageInputElem.value;

      if (sigmaValue <= 0) {
        return alert(
          "Допускаемое напряжение не может быть отрицательным или равным 0"
        );
      }

      if (elastValue <= 0) {
        return alert(
          "Модуль упругости не может быть отрицательным или равным 0"
        );
      }

      listOfSigma.push(sigmaValue);
      listOfYoungModulus.push(elastValue);
      listOfLength.push(lengthValue);
      listOfWidth.push(areaValue);

      if (lengthValue > 1) {
        schemeBarLengthValueElem.innerText = `${lengthValue}L`;
      } else {
        schemeBarLengthValueElem.innerText = "L";
      }

      if (elastValue > 1) {
        schemeBarElastValueElem.innerText = `${elastValue}E,`;
      } else {
        schemeBarElastValueElem.innerText = "E,";
      }

      if (areaValue > 1) {
        schemeBarAreaValueElem.innerText = `${areaValue}A`;
      } else {
        schemeBarAreaValueElem.innerText = "A";
      }

      if (lengthValue > 0) {
        if (lengthValue > 1) {
          schemeBarElem.style.minWidth = lengthValue * 50 + 100 + "px";
        }
      } else {
        return alert("Введите корректные значения длины стержня");
      }

      if (areaValue > 0) {
        if (areaValue > 1) {
          schemeBarElemHeight = areaValue * 35 + 35;
          schemeBarElemMaxHeight = Math.max(
            schemeBarElemHeight,
            schemeBarElemMaxHeight
          );
          schemeBarElem.style.minHeight = `${schemeBarElemHeight}px`;
        }
      } else {
        return alert("Введите корректные значения площади стержня");
      }

      schemeBarListElem.append(schemeBarElem);
      schemeBarLengthLineElem.append(schemeBarLengthValueElem);
      schemeBarElem.append(schemeBarElastValueElem);
      schemeBarElem.append(schemeBarAreaValueElem);

      const currentLinearLoad = linearTableElem.children[i];
      const linearLoadInputElem = currentLinearLoad.querySelector("#q");
      addLinearLoad(linearLoadInputElem, listOfLoads, schemeBarElem);

      let currentPointLoad = pointTableElem.children[i];
      let pointLoadInputElem = currentPointLoad.querySelector("#qL");
      addPointLoad(pointLoadInputElem, schemeBarElem, powers, i);

      let currentNextPointLoad = pointTableElem.children[i + 1];
      let pointLoadNextInputElem = currentNextPointLoad.querySelector("#qL");
      addNextPointLoad(pointLoadNextInputElem, schemeBarElem, powers, i);
    }

    let checkboxElements = document.querySelectorAll("[data-radio]");
    let lastBarElem =
      schemeBarListElem.children[schemeBarListElem.children.length - 1];

    const schemeBarListElemRect = schemeBarListElem.getBoundingClientRect();
    const schemeBarListElemHeight = schemeBarListElemRect.height;

    document.querySelectorAll(".scheme__item").forEach((el) => {
      const top =
        schemeBarListElemRect.height / 2 -
        el.getBoundingClientRect().height / 2;
      const line = el.querySelector(".scheme__length-line");

      const height = schemeBarListElemHeight - top + 10;

      line.style.top = `${height}px`;
    });

    checkboxElements.forEach((checkbox) => {
      if (checkbox.checked) {
        if (checkbox.id == "left") {
          let supportElem = document.createElement("div");
          supportElem.className = "scheme__support";
          schemeBarListElem.children[0].appendChild(supportElem);
          leftSealing = true;
        } else if (checkbox.id == "right") {
          let supportElem = document.createElement("div");
          supportElem.classList.add(
            "scheme__support",
            "scheme__support--right"
          );
          lastBarElem.appendChild(supportElem);
          rightSealing = true;
        }
      }
    });

    runPythonScript(
      listOfLength,
      listOfWidth,
      listOfYoungModulus,
      listOfSigma,
      listOfLoads,
      powers,
      leftSealing,
      rightSealing,
      valueX,
      rodNumber
    ).then((data) => {
      RESULT_NX = data.get("nx");
      RESULT_UX = data.get("ux");
      RESULT_SGX = data.get("sgx");

      buildChart("nxChart", {
        datasetData: RESULT_NX,
        listOfWidth,
      });
      buildChart("uxChart", {
        datasetData: RESULT_UX,
        listOfWidth,
      });
      buildChart("sgxChart", {
        datasetData: RESULT_SGX,
        listOfWidth,
      });

      const nxTd = document.querySelector("[data-nx]");
      const uxTd = document.querySelector("[data-ux]");
      const sgxTd = document.querySelector("[data-sgx]");

      nxTd.innerHTML = `<th class="results-table__title">Nx</th>${RESULT_NX.map(
        (item) => `<td>${item.join(", ")}</td>`
      ).join("")}`;
      uxTd.innerHTML = `<th class="results-table__title">Ux</th>${RESULT_UX.map(
        (item) => `<td>${item.join(", ")}</td>`
      ).join("")}`;
      sgxTd.innerHTML = `<th class="results-table__title">Sgx</th>${RESULT_SGX.map(
        (item) => `<td>${item.join(", ")}</td>`
      ).join("")}`;
    });
  }
}

const uploadButton = document.getElementById("upload-button");
const fileInput = document.getElementById("file-input");
const deleteButton = document.querySelector("[data-delete-bar-button]");
const barCreateButton = document.querySelector("[data-addbar-button]");
const createConstrButton = document.querySelector("[data-button-createConstr]");

deleteButton.addEventListener("click", deleteBar);
barCreateButton.addEventListener("click", addBar);
createConstrButton.addEventListener("click", createConstruction);

uploadButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let inputArray = document.querySelectorAll("input");

        while (inputArray.length > 3) {
          deleteButton.click();
          inputArray = document.querySelectorAll("input");
        }

        const jsonParse = JSON.parse(e.target.result);
        const valuesArray = Object.values(jsonParse);

        let barFields = (valuesArray.length - 2) / 7;

        for (let i = 0; i < barFields; i++) {
          barCreateButton.click();
        }

        setTimeout(() => {
          inputArray = document.querySelectorAll("input");

          inputArray.forEach((el, index) => {
            if (el.id === "file-input") {
              return;
            }

            const value = valuesArray[index - 1];

            if (
              el.type === "text" ||
              el.type === "number" ||
              el.type === "email"
            ) {
              el.value = value;
            } else if (el.type === "checkbox" || el.type === "radio") {
              el.checked = value === "on" || value === true;
            }

            setTimeout(() => {
              if (
                el.type === "text" ||
                el.type === "number" ||
                el.type === "email"
              ) {
                el.dispatchEvent(new Event("input", { bubbles: true }));
              } else if (el.type === "checkbox" || el.type === "radio") {
                el.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }, 50);
          });

          createConstrButton.click();
        }, 50);
      } catch (error) {
        alert("Ошибка: Неверный формат файла!");
        console.error(error);
      }
    };

    reader.readAsText(file);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const saveButton = document.getElementById("save-button");
  const resultSaveButton = document.getElementById("result-save-button");

  saveButton.addEventListener("click", () => {
    let inputArray = document.querySelectorAll("input");

    const data = {};
    const seenIds = {};

    inputArray.forEach((el) => {
      if (el.id === "file-input") {
        return;
      }
      let key = el.id;
      if (seenIds[key]) {
        seenIds[key]++;
        key = `${key}${seenIds[key]}`;
      } else {
        seenIds[key] = 1;
        key = `${key}${seenIds[key]}`;
      }

      if (el.type === "checkbox") {
        data[key] = el.checked ? "on" : "off";
      } else {
        data[key] = el.value;
      }
    });

    const jsonData = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonData], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "project.json";
    link.click();

    URL.revokeObjectURL(link.href);
  });

  resultSaveButton.addEventListener("click", () => {
    let data = [
      ["NX", "UX", "SGX"], // Заголовки
    ];

    const length = Math.max(
      RESULT_NX.length,
      RESULT_UX.length,
      RESULT_SGX.length
    );

    for (let i = 0; i < length; i++) {
      data[i + 1] = [
        RESULT_NX[i].join(", "),
        RESULT_UX[i].join(", "),
        RESULT_SGX[i].join(", "),
      ];
    }

    // Создаем Workbook и Worksheet
    const workbook = XLSX.utils.book_new(); // Создаем новую книгу
    const worksheet = XLSX.utils.aoa_to_sheet(data); // Преобразуем массив данных в лист

    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, "Лист1");

    // Генерация файла и загрузка
    XLSX.writeFile(workbook, "result.xlsx");
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const checkboxes = document.querySelectorAll("[data-radio]");

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const uncheckedBoxes = Array.from(checkboxes).filter((cb) => !cb.checked);
      if (uncheckedBoxes.length === checkboxes.length) {
        event.target.checked = true;
        alert("Нельзя убрать все опоры");
      }
    });
  });
});
