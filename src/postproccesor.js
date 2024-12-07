import Chart from "chart.js/auto";

//файл результатов расчета

//анализ результатов расчета

//отображение в табличном виде

//графики

const chartByType = {};
const chartElByType = {};

const getDataset = (datasetData) => {
  return datasetData.map((data, index) => ({
    label: `Стержень ${index + 1}`,
    data: [...Array.from({ length: index }, () => null), ...data],
    fill: false,
    borderColor: "blue", 
    tension: 1, 
  }));
};

const getLabels = (listOfWidth) => {
  const labels = listOfWidth.map((_, index) => index);
  return [...labels, labels[labels.length - 1] + 1];
};

export const buildChart = (chartType, chartData) => {
  const chart = chartByType[chartType];

  if (chart) {
    updateChart(chart, chartData);
  } else {
    createChart(chartType, chartData, {
      responsive: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${chartType}: ${context.raw}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: `График ${chartType}`,
          },
        },
        y: {
          title: {
            display: true,
            text: `Значение ${chartType}`,
          },
        },
      },
    });
  }
};

const updateChart = (chart, { listOfWidth, datasetData }) => {
  chart.data.labels = getLabels(listOfWidth);
  chart.data.datasets = getDataset(datasetData);
  chart.update();
};

const createChart = (chartType, chartData, chartOptions) => {
  const { listOfWidth, datasetData } = chartData;

  if (
    !listOfWidth ||
    !datasetData ||
    listOfWidth?.length === 0 ||
    datasetData?.length === 0
  ) {
    console.error(`Невалидные данные для ${chartType}`);
    return;
  }

  chartElByType[chartType] = document
    .getElementById(chartType)
    .getContext("2d");

  // Инициализация графика
  chartByType[chartType] = new Chart(chartElByType[chartType], {
    type: "line", // Тип графика
    data: {
      labels: getLabels(listOfWidth), // Значения оси X (listOfWidth)
      datasets: getDataset(datasetData),
    },
    options: chartOptions,
  });
};
