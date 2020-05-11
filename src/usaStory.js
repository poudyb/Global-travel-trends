var margin = {top: 80, right: 80, bottom: 80, left: 80};

const width = Math.round(window.innerWidth * 0.8),
height = Math.round(window.innerHeight * 0.5);

const tooltipDuration = 100;
var tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("z-index", "15")
    .style("visibility", "hidden")
    .style("background", "#eeeeee")
    .style('padding', '20px')
    .style('border', '2px solid grey')
    .style('border-radius', '5px')
    .style('font-size', '1.5em')
    .style('text-align', 'center')


// add in special information for selected years that correspond to story
specialYrs = ['1997','2001','2003','2008','2009'];
specialInfo = {
    '1997':"1997: Congress stopped funding for U.S. Travel and Tourism Advisory Board (USTTAB) that promoted US Tourism",
    '2001':"2001: 9/11 Incident", 
    '2003':"2003: Congress re-established the U.S. Travel and Tourism Advisory Board (USTTAB)",
    '2008':"2008: Financial Crisis",
    '2009':"2009: Lawmakers established a public-private entity to promote U.S. tourism, the Corporation for Trade Promotion, which does business as Brand USA"
};


// load data and display
var promises = [
    d3.csv("data/inbound.csv")
];

Promise.all(promises).then(display); // The method 'ddisplay' runs when all the input JSONs are loaded

function display(data) {  
   var parseDate = d3.timeParse("%Y");
   var inboundData = data[0]
   
   var usaInbound = inboundData.filter(function(d) {
        return d.country_code == "USA";
   });

   var dataToDisplayOnMouseOver = {};
   usaInbound.forEach(function (d) {
      if(specialYrs.indexOf(d.year) >= 0){
        dataToDisplayOnMouseOver[parseDate(d.year)] = specialInfo[d.year];
    }
      else {
        dataToDisplayOnMouseOver[parseDate(d.year)] = d.year;
    }
    });
   
    usaInbound.forEach(function(d) {
       d.year = parseDate(d.year);
       d.value = parseInt(d.value);
    });
   
    var x = d3.scaleTime().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);

    var line = d3.line()
    .x(function(d) { return x(d.year); })
    .y(function(d) { return y(d.value); })
    .curve(d3.curveNatural);

    // Scale the range of the data
    x.domain(d3.extent(usaInbound, function(d) { return d.year; }));
    max_visitors = d3.max(usaInbound, function(d) { return d.value; });
    y.domain([0, Math.ceil(max_visitors/1000000)*1000000]); // round up to nearest million for a clean y-axis
     

    // Add an SVG element with the desired dimensions and margin.
    var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  // Add the line
  svg.append("path")
      .data([usaInbound])
      .attr("class", "line")
      .style('stroke', "blue")
      .style("fill","none")
      .attr("d", function(d) {
          return line(d);
        });
       
   // Appends a circle for each datapoint
    svg.selectAll(".dot")
    .data(usaInbound)
    .enter().append("circle") // Uses the enter().append() method
    .attr("class", "dot") // Assign a class for styling
    .attr("cx", function(d) { return x(d.year) })
    .attr("cy", function(d) { return y(d.value) })
    .attr("r", function (d) {
      if(specialYrs.indexOf(`${d.year.getFullYear()}`) >= 0){
          return 5;
  }
      else{
          return 2.5;
      }

  }) // make dots for 'special years' larger (will re-color next) to direct the readers' attention
  .style("fill", function(d) {
      if(specialYrs.indexOf(`${d.year.getFullYear()}`) >= 0){
          return "red";
  }
      else{
          return "blue";
      }

  }) // make dots for 'special years' red to direct the readers' attention
    .on("mouseover", function (d) {
            dataToDisplay = dataToDisplayOnMouseOver[d.year];
            tooltip.html("<b><u>" + dataToDisplay + "</b></u>"
            + "<br />" + 'International Visitors: ' + d.value.toLocaleString()); // show the year, any special information, & the # int'l visitors;
            return tooltip.transition().duration(tooltipDuration)
                .style("visibility", "visible")
                .style("top", (d3.event.pageY - 10) + "px")
                .style("left", (d3.event.pageX + 10) + "px");
        })
    .on("mouseout", function () {
            return tooltip.style("visibility", "hidden");
        })

  // Add the X Axis
  svg.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + height + ")")
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
    .attr('x', -1 * width)
    .attr('y', -1 * height)
    .attr('height', height+5)
    .attr('width', width-5)
    .attr('class', 'curtain')
    .attr('transform', 'rotate(180)')
    .style('fill', '#ffffff')

  /* Creating a transition of the curtain to give an animation impression */
  curtain.transition()
    .duration(6000)
    .ease(d3.easeLinear)
    .attr('x', -2* width);

}