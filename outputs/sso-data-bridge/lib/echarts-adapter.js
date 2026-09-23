export function buildEChartsOption({ widget, pivot, theme, metricLabel = "" }) {
  const palette = getPalette(widget, theme);
  const common = buildCommonOption(theme, pivot);

  if (widget.type === "pie") {
    return buildPieOption({ widget, pivot, theme, palette, common });
  }
  if (widget.type === "line") {
    return buildLineOption({ widget, pivot, theme, palette, common, metricLabel });
  }
  if (widget.type === "bar" || widget.type === "stackedBar") {
    return buildBarOption({
      widget,
      pivot,
      theme,
      palette,
      common,
      metricLabel,
      stacked: widget.type === "stackedBar"
    });
  }
  return {
    ...common,
    series: []
  };
}

function buildCommonOption(theme, pivot) {
  const textColor = theme.textColor;
  return {
    animation: false,
    color: theme.colors,
    backgroundColor: "transparent",
    textStyle: {
      color: textColor,
      fontFamily: "Inter, PingFang SC, Microsoft YaHei, sans-serif"
    },
    aria: {
      enabled: true
    },
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: theme.tooltipBackground,
      borderWidth: 0,
      textStyle: {
        color: getContrastTextColor(theme.tooltipBackground),
        fontSize: 11
      }
    },
    legend: {
      type: "scroll",
      textStyle: {
        color: theme.legendTextColor,
        fontSize: 10
      },
      pageTextStyle: {
        color: theme.mutedTextColor
      },
      pageIconColor: theme.textColor,
      pageIconInactiveColor: theme.axisColor
    },
    dataset: {
      source: []
    }
  };
}

function buildBarOption({ widget, pivot, theme, palette, common, metricLabel, stacked }) {
  const labels = pivot.labels.map((label) => String(label));
  const hasManyLabels = labels.length > 18;
  const singleSeries = pivot.seriesNames.length <= 1;
  const seriesNames = singleSeries
    ? [metricLabel || "指标"]
    : pivot.seriesNames.map((name) => String(name));
  const maxValue = Math.max(
    1,
    ...(stacked ? pivot.totals : pivot.matrix.flat()).map((value) => Number(value) || 0)
  );
  const smallPoints = [];
  const labelLayout = {
    hideOverlap: widget.smallValueMode !== "shrink"
  };
  const series = seriesNames.map((name, index) => {
    const color = getSeriesColor({ widget, palette, singleSeries, index });
    let cumulative = 0;
    return {
      name,
      type: "bar",
      stack: stacked ? "total" : undefined,
      data: (pivot.matrix[index] || []).map((value, labelIndex) => {
        const numericValue = Number(value) || 0;
        const ratio = numericValue / maxValue;
        const small = ratio < 0.06;
        const mode = widget.smallValueMode || "leader";
        const itemColor = Array.isArray(widget.colors) && widget.colors.length
          ? singleSeries
            ? widget.colors[labelIndex % widget.colors.length]
            : color
          : color;
        const showLabel = widget.showValues !== false
          && (!small || mode === "shrink");
        if (widget.showValues !== false && small && mode === "leader") {
          smallPoints.push({
            seriesIndex: index,
            labelIndex,
            value: numericValue,
            startValue: stacked ? cumulative : 0,
            endValue: stacked ? cumulative + numericValue : numericValue
          });
        }
        cumulative += numericValue;
        return {
          value: numericValue,
          itemStyle: {
            color: itemColor
          },
          label: {
            show: showLabel,
            color: stacked
              ? getContrastTextColor(itemColor)
              : theme.textColor,
            fontSize: small
              ? Math.max(5, Math.round(6 * Math.min(1, ratio / 0.06)))
              : 9
          },
          emphasis: {
            label: {
              show: true
            }
          }
        };
      }),
      barMaxWidth: 52,
      itemStyle: {
        color,
        borderRadius: stacked ? 0 : [3, 3, 0, 0]
      },
      label: {
        show: widget.showValues !== false,
        position: stacked ? "inside" : "top",
        color: stacked ? getContrastTextColor(color) : theme.textColor,
        fontSize: 9,
        overflow: "truncate",
        width: 72,
        formatter: ({ value }) => formatMetric(value)
      },
      labelLayout,
      emphasis: {
        focus: "series"
      }
    };
  });

  return {
    ...common,
    tooltip: {
      ...common.tooltip,
      trigger: "axis",
      axisPointer: {
        type: "shadow"
      }
    },
    grid: {
      left: hasManyLabels ? 100 : 10,
      right: widget.smallValueMode === "leader" ? 78 : 36,
      top: 28,
      bottom: hasManyLabels ? 82 : 22,
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: {
        lineStyle: {
          color: theme.axisColor
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: buildCategoryAxisLabel(widget, labels, theme)
    },
    yAxis: {
      type: "value",
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: theme.mutedTextColor,
        fontSize: 10,
        formatter: (value) => formatMetric(value)
      },
      splitLine: {
        lineStyle: {
          color: theme.gridColor
        }
      }
    },
    dataZoom: buildDataZoom(hasManyLabels, theme, labels, widget.axisLabelMode),
    series,
    __ssoMeta: {
      smallPoints
    }
  };
}

function buildPieOption({ widget, pivot, theme, palette, common }) {
  const labels = pivot.labels.map((label) => String(label));
  const values = pivot.totals.map((value) => Number(value) || 0);
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  const verticalLegend = labels.length > (widget.pieLegendThreshold || 6);
  const hoverLabels = widget.smallValueMode === "hover";

  return {
    ...common,
    tooltip: {
      ...common.tooltip,
      trigger: "item",
      formatter: ({ name, value, percent }) => (
        `${name}<br/>${formatMetric(value)} · ${Number(percent || 0).toFixed(1)}%`
      )
    },
    legend: {
      ...common.legend,
      orient: verticalLegend ? "vertical" : "horizontal",
      right: verticalLegend ? 0 : "center",
      left: verticalLegend ? undefined : "center",
      top: verticalLegend ? "middle" : 0,
      bottom: verticalLegend ? undefined : "auto",
      width: verticalLegend ? "30%" : "92%",
      height: verticalLegend ? "84%" : "auto",
      itemGap: 8,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        ...common.legend.textStyle,
        overflow: "break",
        width: verticalLegend ? 96 : undefined
      }
    },
    series: [{
      name: "占比",
      type: "pie",
      radius: ["0%", "64%"],
      center: verticalLegend ? ["34%", "54%"] : ["42%", "54%"],
      avoidLabelOverlap: true,
      minAngle: 1,
      padAngle: 1,
      itemStyle: {
        borderColor: theme.backgroundColor,
        borderWidth: 1
      },
      emphasis: {
        scaleSize: 5,
        label: {
          show: true
        }
      },
      label: {
        show: false,
        color: theme.textColor,
        fontSize: 9,
        formatter: ({ name, value, percent }) => {
          const label = widget.showLegendText ? `${name}; ` : "";
          return `${label}${formatMetric(value)}; ${Number(percent || 0).toFixed(1)}%`;
        }
      },
      labelLine: {
        show: false,
        length: 10,
        length2: 8,
        smooth: true,
        lineStyle: {
          color: theme.axisColor
        }
      },
      labelLayout: {
        hideOverlap: widget.smallValueMode !== "shrink"
      },
      data: labels.map((name, index) => {
        const share = total > 0 ? Math.max(0, values[index]) / total : 0;
        const small = share < 0.05;
        const shrink = small && widget.smallValueMode === "shrink";
        const sliceColor = palette[index % palette.length];
        const showLabel = widget.showValues !== false
          && (!small || !hoverLabels);
        return {
          name,
          value: values[index],
          itemStyle: {
            color: sliceColor
          },
          label: {
            show: showLabel,
            position: small && !shrink ? "outside" : "inside",
            color: small && !shrink
              ? theme.textColor
              : getContrastTextColor(sliceColor),
            fontSize: shrink ? Math.max(5, Math.min(7, share * 100 + 4)) : 9
          },
          labelLine: {
            show: small && !shrink && !hoverLabels
          },
          tooltip: {
            formatter: `${name}<br/>${formatMetric(values[index])} · ${
              (share * 100).toFixed(1)
            }%`
          }
        };
      })
    }],
    media: [{
      query: {
        maxWidth: 520
      },
      option: {
        legend: {
          orient: "horizontal",
          left: "center",
          right: undefined,
          top: "auto",
          bottom: 0,
          width: "92%",
          height: 68
        },
        series: [{
          center: ["50%", "42%"],
          radius: ["0%", "48%"]
        }]
      }
    }]
  };
}

function buildLineOption({ widget, pivot, theme, palette, common, metricLabel }) {
  const labels = pivot.labels.map((label) => String(label));
  const hasManyLabels = labels.length > 18;
  const singleSeries = pivot.seriesNames.length <= 1;
  const seriesNames = singleSeries
    ? [metricLabel || "指标"]
    : pivot.seriesNames.map((name) => String(name));
  const series = seriesNames.map((name, index) => ({
    name,
    type: "line",
    data: pivot.matrix[index] || [],
    smooth: false,
    connectNulls: true,
    showSymbol: labels.length <= 40,
    symbolSize: 5,
    lineStyle: {
      width: 2,
      color: getSeriesColor({ widget, palette, singleSeries, index })
    },
    itemStyle: {
      color: getSeriesColor({ widget, palette, singleSeries, index })
    },
    label: {
      show: widget.showValues !== false && labels.length <= 24,
      position: "top",
      color: theme.textColor,
      fontSize: 9,
      formatter: ({ value }) => formatMetric(value)
    },
    labelLayout: {
      hideOverlap: true
    },
    emphasis: {
      focus: "series"
    }
  }));

  return {
    ...common,
    tooltip: {
      ...common.tooltip,
      trigger: "axis"
    },
    grid: {
      left: hasManyLabels ? 100 : 10,
      right: 36,
      top: 30,
      bottom: hasManyLabels ? 82 : 22,
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: {
        lineStyle: {
          color: theme.axisColor
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: buildCategoryAxisLabel(widget, labels, theme)
    },
    yAxis: {
      type: "value",
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: theme.mutedTextColor,
        fontSize: 10,
        formatter: (value) => formatMetric(value)
      },
      splitLine: {
        lineStyle: {
          color: theme.gridColor
        }
      }
    },
    dataZoom: buildDataZoom(hasManyLabels, theme, labels, widget.axisLabelMode),
    series
  };
}

function buildCategoryAxisLabel(widget, labels, theme) {
  const wrap = widget.axisLabelMode === "wrap";
  const longLabel = labels.some((label) => String(label).length > 8);
  return {
    color: theme.mutedTextColor,
    fontSize: 10,
    interval: 0,
    hideOverlap: !wrap,
    margin: 12,
    rotate: wrap ? 0 : longLabel ? 28 : 0,
    align: wrap ? "center" : longLabel ? "right" : "center",
    verticalAlign: "middle",
    overflow: wrap ? "break" : "none",
    width: wrap ? 84 : undefined,
    lineHeight: 11,
    formatter: wrap
      ? (value) => wrapLabel(value, 8)
      : (value) => String(value)
  };
}

function buildDataZoom(visible, theme, labels = [], axisLabelMode = "scroll") {
  if (!visible) {
    return [];
  }
  const averageLength = labels.length
    ? labels.reduce((sum, label) => sum + String(label).length, 0) / labels.length
    : 8;
  const targetSlotWidth = axisLabelMode === "wrap"
    ? 86
    : Math.max(74, Math.min(150, averageLength * 7));
  const visibleCount = Math.max(
    3,
    Math.min(12, Math.floor(720 / targetSlotWidth))
  );
  return [{
    type: "slider",
    height: 18,
    left: 44,
    right: 44,
    bottom: 12,
    startValue: 0,
    endValue: Math.min(labels.length - 1, visibleCount - 1),
    showDetail: false,
    brushSelect: false,
    borderColor: theme.gridColor,
    fillerColor: hexToRgba(theme.colors[0], 0.16),
    textStyle: {
      color: theme.mutedTextColor,
      fontSize: 9
    }
  }];
}

function getSeriesColor({ widget, palette, singleSeries, index }) {
  if (Array.isArray(widget.colors) && widget.colors.length) {
    return widget.colors[index % widget.colors.length];
  }
  if (singleSeries) {
    return palette[0];
  }
  return palette[index % palette.length];
}

function getPalette(widget, theme) {
  const colors = Array.isArray(widget?.colors)
    ? widget.colors.filter(isColor)
    : [];
  return colors.length ? colors : theme.colors;
}

function isColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || ""));
}

function formatMetric(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return String(value ?? "-");
  }
  return Number.isInteger(number)
    ? number.toLocaleString("zh-CN")
    : number.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function wrapLabel(value, maxChars) {
  const text = String(value ?? "");
  if (text.length <= maxChars) {
    return text;
  }
  const lines = [];
  for (let index = 0; index < text.length; index += maxChars) {
    lines.push(text.slice(index, index + maxChars));
  }
  return lines.join("\n");
}

function hexToRgba(hex, alpha) {
  const source = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(source)) {
    return `rgba(15, 118, 110, ${alpha})`;
  }
  const number = Number.parseInt(source, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getContrastTextColor(background) {
  const source = String(background || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(source)) {
    return "#ffffff";
  }
  const number = Number.parseInt(source, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? "#17211d" : "#ffffff";
}
