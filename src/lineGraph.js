// Work in progress
const chartWidth = Math.round(window.innerWidth * 0.4),
      chartHeight = Math.round(window.innerHeight * 0.4);
const padWidth = Math.round(window.innerWidth * 0.05);

d3.select("body")
    .style('width', chartWidth + 'px');

function drawLineGraph(country="United States of America", inboundData) {
   var parseDate = d3.timeParse("%Y");
      
   var countryInboundData = inboundData.filter(function(d) {
        return d.country_name == country;
   });
   
    countryInboundData.forEach(function(d) {
       d.year = parseDate(d.year);
       d.value = parseInt(d.value);
    });
   
    var x = d3.scaleTime().range([0, chartWidth]);
    var y = d3.scaleLinear().range([chartHeight, 0]);

    var line = d3.line()
    .x(function(d) { return x(d.year); })
    .y(function(d) { return y(d.value); })
    .curve(d3.curveNatural);

    // Scale the range of the data
    x.domain(d3.extent(countryInboundData, function(d) { return d.year; }));
    max_visitors = d3.max(countryInboundData, function(d) { return d.value; });
    y.domain([0, Math.ceil(max_visitors/1000000)*1000000]); // round up to nearest million for a clean y-axis
     

    // Add an SVG element with the desired dimensions and margin.
    var svg = d3.select("body").append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .style('padding', padWidth)
    .append("g");


  // Add the line
  svg.append("path")
      .data([countryInboundData])
      .attr("class", "line")
      .style('stroke', "blue")
      .style("fill","none")
      .attr("d", function(d) {
          return line(d);
        });
       
   // Appends a circle for each datapoint
    svg.selectAll(".dot")
    .data(countryInboundData)
    .enter().append("circle") // Uses the enter().append() method
    .attr("class", "dot") // Assign a class for styling
    .attr("cx", function(d) { return x(d.year) })
    .attr("cy", function(d) { return y(d.value) })
    .attr("r", 2.5) 

  // Add the X Axis
  svg.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + chartHeight + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.4em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");

  // Add the Y Axis
  svg.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y));
 
   
  /* Add 'curtain' rectangle to hide entire graph */
  var curtain = svg.append('rect')
    .attr('x', -1 * chartWidth)
    .attr('y', -1 * chartHeight)
    .attr('height', chartHeight+5)
    .attr('width', chartWidth-5)
    .attr('class', 'curtain')
    .attr('transform', 'rotate(180)')
    .style('fill', '#ffffff')

  /* Creating a transition of the curtain to give an animation impression */
  curtain.transition()
    .duration(6000)
    .ease(d3.easeLinear)
    .attr('x', -2* chartWidth);
}