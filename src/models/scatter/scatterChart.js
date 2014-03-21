nv.models.scatterChart = function () {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var scatter = nv.models.scatter(),
        xAxis = nv.models.axis(),
        yAxis = nv.models.axis(),
        controls = nv.models.legend(),
        distX = nv.models.distribution(),
        distY = nv.models.distribution();

    var canvas = new Chart({
        chartClass: 'scatterChart',
        wrapClass: 'scatterWrap',
        margin: {
            top: 30,
            right: 20,
            bottom: 50,
            left: 75
        }
    }),
        color = nv.utils.defaultColor(),
        x = d3.fisheye ? d3.fisheye.scale(d3.scale.linear)
            .distortion(0) : scatter.xScale(),
        y = d3.fisheye ? d3.fisheye.scale(d3.scale.linear)
            .distortion(0) : scatter.yScale(),
        xPadding = 0,
        yPadding = 0,
        showDistX = false,
        showDistY = false,
        showXAxis = true,
        showYAxis = true,
        rightAlignYAxis = false,
        showControls = !! d3.fisheye,
        fisheye = 0,
        pauseFisheye = false,
        tooltips = true,
        tooltipX = function (key, x) {
            return '<strong>' + x + '</strong>'
        },
        tooltipY = function (key, x, y) {
            return '<strong>' + y + '</strong>'
        },
        tooltip = null,
        state = {},
        defaultState = null,
        dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange',
            'changeState', 'renderEnd'),
        transitionDuration = 250,
        duration = 250;

    scatter
        .xScale(x)
        .yScale(y);
    xAxis
        .orient('bottom')
        .tickPadding(10);
    yAxis
        .orient((rightAlignYAxis) ? 'right' : 'left')
        .tickPadding(10);
    distX
        .axis('x');
    distY
        .axis('y');

    controls.updateState(false);

    //============================================================

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x0, y0;
    var renderWatch = nv.utils.renderWatch(dispatch, duration);

    var showTooltip = function (e, offsetElement) {
        //TODO: make tooltip style an option between single or dual on axes (maybe on all charts with axes?)

        var left = e.pos[0] + (offsetElement.offsetLeft || 0),
            top = e.pos[1] + (offsetElement.offsetTop || 0),
            leftX = e.pos[0] + (offsetElement.offsetLeft || 0),
            topX = y.range()[0] + canvas.margin.top + (offsetElement.offsetTop ||
                0),
            leftY = x.range()[0] + canvas.margin.left + (offsetElement.offsetLeft ||
                0),
            topY = e.pos[1] + (offsetElement.offsetTop || 0),
            xVal = xAxis.tickFormat()(scatter.x()(e.point, e.pointIndex)),
            yVal = yAxis.tickFormat()(scatter.y()(e.point, e.pointIndex));

        if (tooltipX !== null)
            nv.tooltip.show([leftX, topX], tooltipX(e.series.key, xVal, yVal, e,
                chart), 'n', 1, offsetElement, 'x-nvtooltip');
        if (tooltipY !== null)
            nv.tooltip.show([leftY, topY], tooltipY(e.series.key, xVal, yVal, e,
                chart), 'e', 1, offsetElement, 'y-nvtooltip');
        if (tooltip !== null)
            nv.tooltip.show([left, top], tooltip(e.series.key, xVal, yVal, e,
                chart), e.value < 0 ? 'n' : 's', null, offsetElement);
    };

    var controlsData = [
        {
            key: 'Magnify',
            disabled: true
        }
  ];

    //============================================================

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(scatter);
        if (showXAxis) renderWatch.models(xAxis);
        if (showYAxis) renderWatch.models(yAxis);
        if (showDistX) renderWatch.models(distX);
        if (showDistY) renderWatch.models(distY);

        selection.each(function (data) {
            canvas.setRoot(this);
            var that = this;

            chart.update = function () {
                canvas.svg.transition()
                    .duration(transitionDuration)
                    .call(chart);
            };
            chart.container = this;

            //set state.disabled
            state.disabled = data.map(function (d) {
                return !!d.disabled
            });

            if (!defaultState) {
                var key;
                defaultState = {};
                for (key in state) {
                    if (state[key] instanceof Array)
                        defaultState[key] = state[key].slice(0);
                    else
                        defaultState[key] = state[key];
                }
            }

            if (canvas.noData(data)) {
                return chart;
            }

            x0 = x0 || x;
            y0 = y0 || y;

            canvas.wrapChart(data, ['nv-distWrap', 'nv-controlsWrap']);

            if (showControls) {
                controls.width(180)
                    .color(['#444']);
                canvas.g.select('.nv-controlsWrap')
                    .datum(controlsData)
                    .attr('transform', 'translate(0,' + (-canvas.margin.top) +
                        ')')
                    .call(controls);
            }

            canvas.wrap.attr('transform', 'translate(' + canvas.margin.left +
                ',' + canvas.margin.top + ')');

            if (rightAlignYAxis) {
                canvas.g.select(".nv-y.nv-axis")
                    .attr("transform", "translate(" + canvas.available.width +
                        ",0)");
            }

            //------------------------------------------------------------
            // Main Chart Component(s)

            scatter
                .width(canvas.available.width)
                .height(canvas.available.height)
                .color(data.map(function (d, i) {
                        return d.color || color(d, i);
                    })
                    .filter(function (d, i) {
                        return !data[i].disabled
                    }));

            if (xPadding !== 0)
                scatter.xDomain(null);

            if (yPadding !== 0)
                scatter.yDomain(null);

            canvas.wrap.select('.nv-scatterWrap')
                .datum(data.filter(function (d) {
                    return !d.disabled
                }))
                .call(scatter);

            //Adjust for x and y padding
            if (xPadding !== 0) {
                var xRange = x.domain()[1] - x.domain()[0];
                scatter.xDomain([x.domain()[0] - (xPadding * xRange), x.domain()[
                    1] + (xPadding * xRange)]);
            }

            if (yPadding !== 0) {
                var yRange = y.domain()[1] - y.domain()[0];
                scatter.yDomain([y.domain()[0] - (yPadding * yRange), y.domain()[
                    1] + (yPadding * yRange)]);
            }

            //Only need to update the scatter again if x/yPadding changed the domain.
            if (yPadding !== 0 || xPadding !== 0) {
                canvas.wrap.select('.nv-scatterWrap')
                    .datum(data.filter(function (d) {
                        return !d.disabled
                    }))
                    .call(scatter);
            }

            //------------------------------------------------------------

            //------------------------------------------------------------
            // Setup Axes
            if (showXAxis) {
                xAxis
                    .scale(x)
                    .ticks(xAxis.ticks() && xAxis.ticks()
                        .length ? xAxis.ticks() : canvas.available.width /
                        100)
                    .tickSize(-canvas.available.height, 0);

                canvas.g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y.range()[0] + ')')
                    .call(xAxis);

            }

            if (showYAxis) {
                yAxis
                    .scale(y)
                    .ticks(yAxis.ticks() && yAxis.ticks()
                        .length ? yAxis.ticks() : canvas.available.height /
                        36)
                    .tickSize(-canvas.available.width, 0);

                canvas.g.select('.nv-y.nv-axis')
                    .call(yAxis);
            }

            if (showDistX) {
                distX
                    .getData(scatter.x())
                    .scale(x)
                    .width(canvas.available.width)
                    .color(data.map(function (d, i) {
                            return d.color || color(d, i);
                        })
                        .filter(function (d, i) {
                            return !data[i].disabled
                        }));
                canvas.gEnter.select('.nv-distWrap')
                    .append('g')
                    .attr('class', 'nv-distributionX');
                canvas.g.select('.nv-distributionX')
                    .attr('transform', 'translate(0,' + y.range()[0] + ')')
                    .datum(data.filter(function (d) {
                        return !d.disabled
                    }))
                    .call(distX);
            }

            if (showDistY) {
                distY
                    .getData(scatter.y())
                    .scale(y)
                    .width(canvas.available.height)
                    .color(data.map(function (d, i) {
                            return d.color || color(d, i);
                        })
                        .filter(function (d, i) {
                            return !data[i].disabled
                        }));
                canvas.gEnter.select('.nv-distWrap')
                    .append('g')
                    .attr('class', 'nv-distributionY');
                canvas.g.select('.nv-distributionY')
                    .attr('transform',
                        'translate(' + (rightAlignYAxis ? canvas.available.width : -
                            distY.size()) + ',0)')
                    .datum(data.filter(function (d) {
                        return !d.disabled
                    }))
                    .call(distY);
            }

            //------------------------------------------------------------

            if (d3.fisheye) {
                canvas.g.select('.nv-background')
                    .attr('width', canvas.available.width)
                    .attr('height', canvas.available.height);

                canvas.g.select('.nv-background')
                    .on('mousemove', updateFisheye);
                canvas.g.select('.nv-background')
                    .on('click', function () {
                        pauseFisheye = !pauseFisheye;
                    });
                scatter.dispatch.on('elementClick.freezeFisheye', function () {
                    pauseFisheye = !pauseFisheye;
                });
            }

            function updateFisheye() {
                /*jshint validthis:true */ // Because mbostoc does bad things to this
                if (pauseFisheye) {
                    canvas.g.select('.nv-point-paths')
                        .style('pointer-events', 'all');
                    return false;
                }

                canvas.g.select('.nv-point-paths')
                    .style('pointer-events', 'none');

                var mouse = d3.mouse(this);
                x.distortion(fisheye)
                    .focus(mouse[0]);
                y.distortion(fisheye)
                    .focus(mouse[1]);

                canvas.g.select('.nv-scatterWrap')
                    .call(scatter);

                if (showXAxis)
                    canvas.g.select('.nv-x.nv-axis')
                        .call(xAxis);

                if (showYAxis)
                    canvas.g.select('.nv-y.nv-axis')
                        .call(yAxis);

                canvas.g.select('.nv-distributionX')
                    .datum(data.filter(function (d) {
                        return !d.disabled
                    }))
                    .call(distX);
                canvas.g.select('.nv-distributionY')
                    .datum(data.filter(function (d) {
                        return !d.disabled
                    }))
                    .call(distY);
            }

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            controls.dispatch.on('legendClick', function (d) {
                d.disabled = !d.disabled;

                fisheye = d.disabled ? 0 : 2.5;
                canvas.g.select('.nv-background')
                    .style('pointer-events', d.disabled ? 'none' :
                        'all');
                canvas.g.select('.nv-point-paths')
                    .style('pointer-events', d.disabled ? 'all' :
                        'none');

                if (d.disabled) {
                    x.distortion(fisheye)
                        .focus(0);
                    y.distortion(fisheye)
                        .focus(0);

                    canvas.g.select('.nv-scatterWrap')
                        .call(scatter);
                    canvas.g.select('.nv-x.nv-axis')
                        .call(xAxis);
                    canvas.g.select('.nv-y.nv-axis')
                        .call(yAxis);
                } else {
                    pauseFisheye = false;
                }

                chart.update();
            });

            canvas.legend.dispatch.on('stateChange', function (newState) {
                state.disabled = newState.disabled;
                dispatch.stateChange(state);
                chart.update();
            });

            scatter.dispatch.on('elementMouseover.tooltip', function (e) {
                d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' +
                    e.seriesIndex + ' .nv-distx-' + e.pointIndex)
                    .attr('y1', function () {
                        return e.pos[1] - canvas.available.height;
                    });
                d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' +
                    e.seriesIndex + ' .nv-disty-' + e.pointIndex)
                    .attr('x2', e.pos[0] + distX.size());

                e.pos = [e.pos[0] + canvas.margin.left, e.pos[1] +
                    canvas.margin.top];
                dispatch.tooltipShow(e);
            });

            dispatch.on('tooltipShow', function (e) {
                if (tooltips) showTooltip(e, that.parentNode);
            });

            // Update chart from a state object passed to event handler
            dispatch.on('changeState', function (e) {

                if (typeof e.disabled !== 'undefined') {
                    data.forEach(function (series, i) {
                        series.disabled = e.disabled[i];
                    });

                    state.disabled = e.disabled;
                }

                chart.update();
            });

            //============================================================

            //store old scales for use in transitions on update
            x0 = x.copy();
            y0 = y.copy();
        });

        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    scatter.dispatch.on('elementMouseout.tooltip', function (e) {
        dispatch.tooltipHide(e);

        d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex +
            ' .nv-distx-' + e.pointIndex)
            .attr('y1', 0);
        d3.select('.nv-chart-' + scatter.id() + ' .nv-series-' + e.seriesIndex +
            ' .nv-disty-' + e.pointIndex)
            .attr('x2', distY.size());
    });
    dispatch.on('tooltipHide', function () {
        if (tooltips) nv.tooltip.cleanup();
    });

    //============================================================

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.scatter = scatter;
    chart.legend = canvas.legend;
    chart.controls = controls;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.distX = distX;
    chart.distY = distY;

    d3.rebind(chart, scatter, 'id', 'interactive', 'pointActive', 'x', 'y',
        'shape', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain',
        'xRange', 'yRange', 'sizeDomain', 'sizeRange', 'forceX', 'forceY',
        'forceSize', 'clipVoronoi', 'clipRadius', 'useVoronoi');
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart.margin = function (_) {
        if (!arguments.length) return canvas.margin;
        canvas.margin.top = nv.utils.valueOrDefault(_.top, canvas.margin.top);
        canvas.margin.right = nv.utils.valueOrDefault(_.right, canvas.margin.right);
        canvas.margin.bottom = nv.utils.valueOrDefault(_.bottom, canvas.margin.bottom);
        canvas.margin.left = nv.utils.valueOrDefault(_.left, canvas.margin.left);
        return chart;
    };

    chart.width = function (_) {
        if (!arguments.length) return canvas.options.size.width;
        canvas.options.size.width = _;
        return chart;
    };

    chart.height = function (_) {
        if (!arguments.length) return canvas.options.size.height;
        canvas.options.size.height = _;
        return chart;
    };

    chart.color = function (_) {
        if (!arguments.length) return color;
        color = nv.utils.getColor(_);
        chart.legend.color(color);
        distX.color(color);
        distY.color(color);
        return chart;
    };

    chart.showDistX = function (_) {
        if (!arguments.length) return showDistX;
        showDistX = _;
        return chart;
    };

    chart.showDistY = function (_) {
        if (!arguments.length) return showDistY;
        showDistY = _;
        return chart;
    };

    chart.showControls = function (_) {
        if (!arguments.length) return showControls;
        showControls = _;
        return chart;
    };

    chart.showLegend = function (_) {
        if (!arguments.length) return canvas.options.showLegend;
        canvas.options.showLegend = _;
        return chart;
    };

    chart.showXAxis = function (_) {
        if (!arguments.length) return showXAxis;
        showXAxis = _;
        return chart;
    };

    chart.showYAxis = function (_) {
        if (!arguments.length) return showYAxis;
        showYAxis = _;
        return chart;
    };

    chart.rightAlignYAxis = function (_) {
        if (!arguments.length) return rightAlignYAxis;
        rightAlignYAxis = _;
        yAxis.orient((_) ? 'right' : 'left');
        return chart;
    };

    chart.fisheye = function (_) {
        if (!arguments.length) return fisheye;
        fisheye = _;
        return chart;
    };

    chart.xPadding = function (_) {
        if (!arguments.length) return xPadding;
        xPadding = _;
        return chart;
    };

    chart.yPadding = function (_) {
        if (!arguments.length) return yPadding;
        yPadding = _;
        return chart;
    };

    chart.tooltips = function (_) {
        if (!arguments.length) return tooltips;
        tooltips = _;
        return chart;
    };

    chart.tooltipContent = function (_) {
        if (!arguments.length) return tooltip;
        tooltip = _;
        return chart;
    };

    chart.tooltipXContent = function (_) {
        if (!arguments.length) return tooltipX;
        tooltipX = _;
        return chart;
    };

    chart.tooltipYContent = function (_) {
        if (!arguments.length) return tooltipY;
        tooltipY = _;
        return chart;
    };

    chart.state = function (_) {
        if (!arguments.length) return state;
        state = _;
        return chart;
    };

    chart.defaultState = function (_) {
        if (!arguments.length) return defaultState;
        defaultState = _;
        return chart;
    };

    chart.noData = function (_) {
        if (!arguments.length) return canvas.options.noData;
        canvas.options.noData = _;
        return chart;
    };

    chart.transitionDuration = function (_) {
        if (!arguments.length) return transitionDuration;
        transitionDuration = _;
        return chart;
    };

    //============================================================

    return chart;
};
