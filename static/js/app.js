
// ==========================================
// SENTIMENT STUDIO
// Frontend Application Logic
// Flask + VADER + Plotly
// ==========================================

const textInput = document.getElementById("textInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const charCount = document.getElementById("charCount");

const resultsSection = document.getElementById("results");
const errorMessage = document.getElementById("errorMessage");

const batchInput = document.getElementById("batchInput");
const batchAnalyzeBtn = document.getElementById("batchAnalyzeBtn");
const batchResults = document.getElementById("batchResults");
const batchErrorMessage = document.getElementById("batchErrorMessage");


// GLOBAL STATE
let latestResult = null;
let latestBatchResult = null;


// ==========================================
// SAMPLE TEXTS
// ==========================================

const samples = {
    positive:
        "I absolutely love this product! The quality is amazing, the service was excellent, and I am extremely happy with my purchase.",

    negative:
        "This was a terrible experience. The product is disappointing, the service was poor, and I am extremely unhappy.",

    neutral:
        "The product arrived yesterday. It contains three components and comes with a standard user manual."
};


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function showError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
}

function hideError(element) {
    element.textContent = "";
    element.classList.add("hidden");
}


function setButtonLoading(button, loading, originalText) {
    button.disabled = loading;

    if (loading) {
        button.textContent = "Processing...";
    } else {
        button.innerHTML = originalText;
    }
}


async function postJSON(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}


// ==========================================
// CHARACTER COUNTER
// ==========================================

if (textInput && charCount) {
    textInput.addEventListener("input", () => {
        charCount.textContent =
            `${textInput.value.length} / 10000 characters`;
    });
}


// ==========================================
// SAMPLE TEXT BUTTONS
// ==========================================

document.querySelectorAll(".sample-btn").forEach(button => {

    button.addEventListener("click", () => {

        const sampleType = button.dataset.sample;

        if (samples[sampleType]) {
            textInput.value = samples[sampleType];

            textInput.dispatchEvent(
                new Event("input")
            );

            textInput.focus();
        }

    });

});


// ==========================================
// SINGLE TEXT ANALYSIS
// ==========================================

if (analyzeBtn) {

    analyzeBtn.addEventListener("click", async () => {

        const text = textInput.value.trim();

        hideError(errorMessage);

        if (!text) {
            showError(
                errorMessage,
                "Please enter some text before analyzing."
            );
            return;
        }

        setButtonLoading(
            analyzeBtn,
            true,
            "Analyze Sentiment →"
        );

        try {

            const data = await postJSON(
                "/api/analyze",
                { text: text }
            );

            latestResult = data;

            // Reveal results BEFORE rendering Plotly charts.
            resultsSection.classList.remove("hidden");

            displayResult(data);

            // Resize charts after the results section becomes visible.
            requestAnimationFrame(() => {
                resizePlotlyCharts();
            });

            // Scroll to the results.
            resultsSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } catch (error) {

            showError(
                errorMessage,
                error.message
            );

        } finally {

            setButtonLoading(
                analyzeBtn,
                false,
                "Analyze Sentiment →"
            );

        }

    });

}


// ==========================================
// DISPLAY SINGLE ANALYSIS RESULTS
// ==========================================

function displayResult(data) {

    const scores = data.scores;
    const statistics = data.statistics;

    const sentiment = data.sentiment;
    const emoji = data.emoji || "😊";

    // Sentiment label
    document.getElementById("sentimentLabel").textContent =
        `${emoji} ${sentiment}`;

    // Sentiment icon and description
    const sentimentIcon = document.getElementById("sentimentIcon");
    const sentimentDescription =
        document.getElementById("sentimentDescription");

    const sentimentConfig = {
        Positive: {
            icon: "😊",
            description: "The text expresses a positive emotional tone."
        },

        Negative: {
            icon: "😞",
            description: "The text expresses a negative emotional tone."
        },

        Neutral: {
            icon: "😐",
            description: "The text has a relatively neutral emotional tone."
        }
    };

    const config = sentimentConfig[sentiment];

    sentimentIcon.textContent = config.icon;
    sentimentDescription.textContent = config.description;

    // Compound score
    document.getElementById("compoundScore").textContent =
        scores.compound.toFixed(4);

    // Convert compound range (-1 to +1) to visual percentage (0 to 100).
    const compoundPercent =
        ((scores.compound + 1) / 2) * 100;

    const compoundBar =
        document.getElementById("compoundBar");

    compoundBar.style.width =
        `${compoundPercent}%`;

    // Statistics
    document.getElementById("wordCount").textContent =
        statistics.words;

    document.getElementById("sentenceCount").textContent =
        statistics.sentences;

    document.getElementById("characterCount").textContent =
        statistics.characters;

    // Sentiment score breakdown
    updateBreakdown(
        "positive",
        scores.positive
    );

    updateBreakdown(
        "negative",
        scores.negative
    );

    updateBreakdown(
        "neutral",
        scores.neutral
    );

    // Plotly visualizations
    updateChart(scores);

}


function updateBreakdown(type, value) {

    const valueElement =
        document.getElementById(`${type}Value`);

    const barElement =
        document.getElementById(`${type}Bar`);

    valueElement.textContent =
        `${value.toFixed(2)}%`;

    barElement.style.width =
        `${value}%`;

}


// ==========================================
// PLOTLY CONFIGURATION
// ==========================================

const plotConfig = {
    responsive: true,
    displayModeBar: false
};


const plotLayout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",

    font: {
        color: "#cbd5e1",
        family: "DM Sans"
    },

    margin: {
        t: 35,
        b: 35,
        l: 35,
        r: 35
    }
};


// ==========================================
// PLOTLY CHARTS
// ==========================================

function updateChart(scores) {

    if (typeof Plotly === "undefined") {
        console.error("Plotly library could not be loaded.");
        return;
    }

    // --------------------------------------
    // 1. RADAR / SPIDER CHART
    // --------------------------------------

    const radarData = [{

        type: "scatterpolar",

        r: [
            scores.positive,
            scores.negative,
            scores.neutral
        ],

        theta: [
            "Positive",
            "Negative",
            "Neutral"
        ],

        fill: "toself",

        fillcolor: "rgba(167,139,250,0.20)",

        line: {
            color: "#a78bfa",
            width: 3
        },

        marker: {
            color: "#55dbc5",
            size: 9
        },

        hovertemplate:
            "%{theta}: %{r:.2f}%<extra></extra>"

    }];


    const radarLayout = {

        ...plotLayout,

        polar: {

            bgcolor: "transparent",

            radialaxis: {
                visible: true,
                range: [0, 100],

                tickfont: {
                    color: "#8c9ab5",
                    size: 9
                },

                gridcolor:
                    "rgba(148,163,184,0.17)"
            },

            angularaxis: {
                gridcolor:
                    "rgba(148,163,184,0.17)",

                tickfont: {
                    color: "#cbd5e1",
                    size: 11
                }
            }

        },

        showlegend: false

    };


    Plotly.react(
        "radarChart",
        radarData,
        radarLayout,
        plotConfig
    );


    // --------------------------------------
    // 2. DOUGHNUT CHART
    // --------------------------------------

    const donutData = [{

        type: "pie",

        hole: 0.68,

        labels: [
            "Positive",
            "Negative",
            "Neutral"
        ],

        values: [
            scores.positive,
            scores.negative,
            scores.neutral
        ],

        marker: {

            colors: [
                "#43d6a0",
                "#ff7185",
                "#f5c76a"
            ],

            line: {
                color: "#141d31",
                width: 4
            }

        },

        textinfo: "label+percent",

        textfont: {
            color: "#edf2ff",
            size: 10
        },

        hovertemplate:
            "%{label}: %{value:.2f}%<extra></extra>"

    }];


    const donutLayout = {

        ...plotLayout,

        showlegend: false

    };


    Plotly.react(
        "donutChart",
        donutData,
        donutLayout,
        plotConfig
    );


    // --------------------------------------
    // 3. COMPOUND SENTIMENT GAUGE
    // --------------------------------------

    const gaugeColor =
        scores.compound >= 0.05
            ? "#43d6a0"
            : scores.compound <= -0.05
                ? "#ff7185"
                : "#f5c76a";


    const gaugeData = [{

        type: "indicator",

        mode: "gauge+number",

        value: scores.compound,

        number: {

            valueformat: ".4f",

            font: {
                size: 32,
                color: "#edf2ff"
            }

        },

        gauge: {

            axis: {

                range: [-1, 1],

                tickvals: [
                    -1,
                    -0.5,
                    0,
                    0.5,
                    1
                ],

                tickfont: {
                    color: "#8c9ab5",
                    size: 10
                }

            },

            bar: {
                color: gaugeColor
            },

            bgcolor: "#141d31",

            borderwidth: 0,

            steps: [

                {
                    range: [-1, -0.05],
                    color: "rgba(255,113,133,0.18)"
                },

                {
                    range: [-0.05, 0.05],
                    color: "rgba(245,199,106,0.18)"
                },

                {
                    range: [0.05, 1],
                    color: "rgba(67,214,160,0.18)"
                }

            ],

            threshold: {

                line: {
                    color: "#edf2ff",
                    width: 3
                },

                thickness: 0.8,

                value: scores.compound

            }

        },

        title: {

            text: "Compound Polarity",

            font: {
                size: 12,
                color: "#8c9ab5"
            }

        }

    }];


    const gaugeLayout = {

        ...plotLayout,

        margin: {
            t: 45,
            b: 15,
            l: 35,
            r: 35
        }

    };


    Plotly.react(
        "gaugeChart",
        gaugeData,
        gaugeLayout,
        plotConfig
    );

}


// ==========================================
// RESIZE PLOTLY CHARTS
// ==========================================

function resizePlotlyCharts() {

    if (typeof Plotly === "undefined") {
        return;
    }

    [
        "radarChart",
        "donutChart",
        "gaugeChart"
    ].forEach(id => {

        const element = document.getElementById(id);

        if (element) {
            Plotly.Plots.resize(element);
        }

    });

}


// ==========================================
// JSON EXPORT
// ==========================================

const exportJsonBtn =
    document.getElementById("exportJsonBtn");


if (exportJsonBtn) {

    exportJsonBtn.addEventListener("click", () => {

        if (!latestResult) {
            return;
        }

        const json = JSON.stringify(
            latestResult,
            null,
            4
        );

        downloadFile(
            json,
            "sentiment_report.json",
            "application/json"
        );

    });

}


// ==========================================
// GENERIC FILE DOWNLOAD
// ==========================================

function downloadFile(content, filename, mimeType) {

    const blob = new Blob(
        [content],
        { type: mimeType }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}


// ==========================================
// BATCH ANALYSIS
// ==========================================

if (batchAnalyzeBtn) {

    batchAnalyzeBtn.addEventListener("click", async () => {

        hideError(batchErrorMessage);

        const texts = batchInput.value
            .split("\n")
            .map(text => text.trim())
            .filter(text => text.length > 0);

        if (texts.length === 0) {

            showError(
                batchErrorMessage,
                "Please enter at least one text."
            );

            return;
        }

        if (texts.length > 100) {

            showError(
                batchErrorMessage,
                "You can analyze a maximum of 100 texts at a time."
            );

            return;
        }

        setButtonLoading(
            batchAnalyzeBtn,
            true,
            "Run Batch Analysis →"
        );

        try {

            const data = await postJSON(
                "/api/batch",
                { texts: texts }
            );

            latestBatchResult = data;

            displayBatchResults(data);

            batchResults.classList.remove("hidden");

            batchResults.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } catch (error) {

            showError(
                batchErrorMessage,
                error.message
            );

        } finally {

            setButtonLoading(
                batchAnalyzeBtn,
                false,
                "Run Batch Analysis →"
            );

        }

    });

}


// ==========================================
// DISPLAY BATCH RESULTS
// ==========================================

function displayBatchResults(data) {

    const distribution = data.distribution;

    document.getElementById("batchTotal").textContent =
        data.analyzed;

    document.getElementById("batchPositive").textContent =
        distribution.positive;

    document.getElementById("batchNegative").textContent =
        distribution.negative;

    document.getElementById("batchNeutral").textContent =
        distribution.neutral;


    const tableBody =
        document.getElementById("batchTableBody");

    tableBody.innerHTML = "";


    data.results.forEach(result => {

        const row = document.createElement("tr");

        const indexCell = document.createElement("td");
        indexCell.textContent = result.index + 1;

        const textCell = document.createElement("td");
        textCell.textContent = result.text || result.error || "Invalid text";

        const sentimentCell = document.createElement("td");

        const scoreCell = document.createElement("td");


        if (result.sentiment) {

            const emoji = result.emoji || "😊";
            sentimentCell.textContent = `${emoji} ${result.sentiment}`;

            scoreCell.textContent =
                result.scores.compound.toFixed(4);

            sentimentCell.className =
                `sentiment-${result.sentiment.toLowerCase()}`;

        } else {

            sentimentCell.textContent = "Error";
            scoreCell.textContent = "—";

        }


        row.appendChild(indexCell);
        row.appendChild(textCell);
        row.appendChild(sentimentCell);
        row.appendChild(scoreCell);

        tableBody.appendChild(row);

    });

}


// ==========================================
// CSV EXPORT
// ==========================================

const exportCsvBtn =
    document.getElementById("exportCsvBtn");


if (exportCsvBtn) {

    exportCsvBtn.addEventListener("click", () => {

        if (!latestBatchResult) {
            return;
        }

        const headers = [
            "Index",
            "Text",
            "Sentiment",
            "Positive",
            "Negative",
            "Neutral",
            "Compound"
        ];

        const rows = latestBatchResult.results.map(result => {

            if (!result.sentiment) {

                return [
                    result.index + 1,
                    result.text || "",
                    "Error",
                    "",
                    "",
                    "",
                    ""
                ];

            }

            return [
                result.index + 1,
                result.text,
                result.sentiment,
                result.scores.positive,
                result.scores.negative,
                result.scores.neutral,
                result.scores.compound
            ];

        });


        const csvContent = [
            headers,
            ...rows
        ].map(row =>

            row.map(value => {

                const escaped = String(value ?? "")
                    .replace(/"/g, '""');

                return `"${escaped}"`;

            }).join(",")

        ).join("\n");


        downloadFile(
            csvContent,
            "sentiment_batch_report.csv",
            "text/csv;charset=utf-8;"
        );

    });

}


// ==========================================
// INITIALIZATION
// ==========================================

console.log("Sentiment Studio initialized successfully.");

console.log("Frontend modules loaded:");
console.log("- Single text analysis");
console.log("- VADER sentiment results");
console.log("- Plotly radar chart");
console.log("- Plotly doughnut chart");
console.log("- Plotly compound gauge");
console.log("- Batch analysis");
console.log("- JSON export");
console.log("- CSV export");
