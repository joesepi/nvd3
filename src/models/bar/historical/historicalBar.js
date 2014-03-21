//TODO: consider deprecating and using multibar with single series for this
nv.models.historicalBar = function() {
  "use strict";
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var canvas= new Canvas({
      margin: {top: 0, right: 0, bottom: 0, left: 0},
      width: 960,
      height: 500,
      chartClass: 'historicalBar'
    }),
    id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
    x = d3.scale.linear(),
    y = d3.scale.linear(),
    getX = function(d) { return d.x },
    getY = function(d) { return d.y },
    forceX = [],
    forceY = [0],
    padData = false,
    clipEdge = true,
    color = nv.utils.defaultColor(),
    xDomain,
    yDomain,
    xRange,
    yRange,
    dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout'),
    interactive = true;

  //============================================================

  function chart(selection) {
    selection.each(function(data) {

      canvas.setRoot(this);

      var availableWidth = canvas.available.width,
          availableHeight = canvas.available.height;

      //------------------------------------------------------------
      // Setup Scales

      x.domain(xDomain || d3.extent(data[0].values.map(getX).concat(forceX) ));

      if (padData)
        x.range(xRange || [availableWidth * 0.5 / data[0].values.length, availableWidth * (data[0].values.length - 0.5)  / data[0].values.length ]);
      else
        x.range(xRange || [0, availableWidth]);

      y.domain(yDomain || d3.extent(data[0].values.map(getY).concat(forceY) ))
        .range(yRange || [availableHeight, 0]);

      // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point

      if (x.domain()[0] === x.domain()[1]) {
        if (x.domain()[0]) {
            x.domain([
              x.domain()[0] - x.domain()[0] * 0.01,
              x.domain()[1] + x.domain()[1] * 0.01
            ]);
          } else {
            x.domain([-1, 1]);
          }
      }

      if (y.domain()[0] === y.domain()[1]) {
        if (y.domain()[0]) {
          y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
        } else {
          y.domain([-1,1])
        }
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      canvas.wrapChart(data[0].values);
      canvas.gEnter.append('g').attr('class', 'nv-bars');
      canvas.wrap.attr('transform', 'translate(' + canvas.margin.left + ',' + canvas.margin.top + ')');

      //------------------------------------------------------------

      canvas.svg.on('click', function(d,i) {
        dispatch.chartClick({
            data: d,
            index: i,
            pos: d3.event,
            id: id
        });
      });

      canvas.defsEnter.append('clipPath')
        .attr('id', 'nv-chart-clip-path-' + id)
        .append('rect');

      canvas.wrap.select('#nv-chart-clip-path-' + id + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

      canvas.g.attr('clip-path', clipEdge ? 'url(#nv-chart-clip-path-' + id + ')' : '');

      var bars = canvas.wrap.select('.nv-bars')
        .selectAll('.nv-bar')
        .data(function(d) { return d }, function(d,i) {return getX(d,i)});

      bars.exit().remove();

      var barsEnter = bars.enter().append('rect')
        //.attr('class', function(d,i,j) { return (getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive') + ' nv-bar-' + j + '-' + i })
        .attr('x', 0 )
        .attr('y', function(d,i) {  return nv.utils.NaNtoZero(y(Math.max(0, getY(d,i)))) })
        .attr('height', function(d,i) { return nv.utils.NaNtoZero(Math.abs(y(getY(d,i)) - y(0))) })
        .attr('transform', function(d,i) { return 'translate(' + (x(getX(d,i)) - availableWidth / data[0].values.length * 0.45) + ',0)'; })
        .on('mouseover', function(d,i) {
          if (!interactive) return;
          d3.select(this).classed('hover', true);
          dispatch.elementMouseover({
            point: d,
            series: data[0],
            pos: [x(getX(d,i)), y(getY(d,i))],  // TODO: Figure out why the value appears to be shifted
            pointIndex: i,
            seriesIndex: 0,
            e: d3.event
          });
        })
        .on('mouseout', function(d,i) {
          if (!interactive) return;
          d3.select(this).classed('hover', false);
          dispatch.elementMouseout({
            point: d,
            series: data[0],
            pointIndex: i,
            seriesIndex: 0,
            e: d3.event
          });
        })
        .on('click', function(d,i) {
          if (!interactive) return;
          dispatch.elementClick({
            //label: d[label],
            value: getY(d,i),
            data: d,
            index: i,
            pos: [x(getX(d,i)), y(getY(d,i))],
            e: d3.event,
            id: id
          });
          d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
          if (!interactive) return;
          dispatch.elementDblClick({
            //label: d[label],
            value: getY(d,i),
            data: d,
            index: i,
            pos: [x(getX(d,i)), y(getY(d,i))],
            e: d3.event,
            id: id
          });
          d3.event.stopPropagation();
        });

      bars
        .attr('fill', function(d,i) { return color(d, i); })
        .attr('class', function(d,i,j) { return (getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive') + ' nv-bar-' + j + '-' + i })
        .transition()
        .attr('transform', function(d,i) { return 'translate(' + (x(getX(d,i)) - availableWidth / data[0].values.length * 0.45) + ',0)'; })
         //TODO: better width calculations that don't assume always uniform data spacing;w
        .attr('width', (availableWidth / data[0].values.length) * 0.9 );

      bars.transition()
        .attr('y', function(d,i) {
          var rval = getY(d,i) < 0 ?
              y(0) :
              y(0) - y(getY(d,i)) < 1 ?
                y(0) - 1 :
                y(getY(d,i));
          return nv.utils.NaNtoZero(rval);
        })
        .attr('height', function(d,i) { return nv.utils.NaNtoZero(Math.max(Math.abs(y(getY(d,i)) - y(0)),1)) });
    });

    return chart;
  }

  //Create methods to allow outside functions to highlight a specific bar.
  chart.highlightPoint = function(pointIndex, isHoverOver) {
    d3.select(".nv-"+canvas.options.chartClass+"-" + id)
      .select(".nv-bars .nv-bar-0-" + pointIndex)
      .classed("hover", isHoverOver);
  };

  chart.clearHighlights = function() {
    d3.select(".nv-"+canvas.options.chartClass+"-" + id)
      .select(".nv-bars .nv-bar.hover")
      .classed("hover", false);
  };
  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return canvas.margin;
      canvas.margin.top    = nv.utils.valueOrDefault(_.top, canvas.margin.top);
      canvas.margin.right  = nv.utils.valueOrDefault(_.right, canvas.margin.right);
      canvas.margin.bottom = nv.utils.valueOrDefault(_.bottom, canvas.margin.bottom);
      canvas.margin.left   = nv.utils.valueOrDefault(_.left, canvas.margin.left);
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return canvas.options.size.width;
    canvas.options.size.width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return canvas.options.size.height;
    canvas.options.size.height = _;
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.xRange = function(_) {
    if (!arguments.length) return xRange;
    xRange = _;
    return chart;
  };

  chart.yRange = function(_) {
    if (!arguments.length) return yRange;
    yRange = _;
    return chart;
  };

  chart.forceX = function(_) {
    if (!arguments.length) return forceX;
    forceX = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.padData = function(_) {
    if (!arguments.length) return padData;
    padData = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.interactive = function(_) {
    if(!arguments.length) return interactive;
    interactive = false;
    return chart;
  };

  //============================================================

  return chart;
};
