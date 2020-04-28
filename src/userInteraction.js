const width = Math.round(window.innerWidth * 0.5),
    height = Math.round(window.innerHeight * 0.5);

viewSize = 1000;

var currentCountry = null;

var svg = d3.select("#world-map").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 " + viewSize + " " + height / width * viewSize);

var promises = [
    d3.json('data/countries-50m.json'),
    d3.csv("data/inbound.csv")
];

Promise.all(promises).then(displayMap);


function displayMap(inputData) {
   
    worldData = inputData[0]
    inboundData = inputData[1]

    
    
    countriesWithData = []

    inboundData.forEach(function (d) {
       if(countriesWithData.indexOf(d.country_name) == -1){
            countriesWithData.push(d.country_name)
        }
	});

    console.log(countriesWithData)

   /* countriesWithData = ["Austria","Canada","China","Croatia","France","Germany","Greece","Hong Kong","Hungary","India","Italy","Macao","Malaysia","Mexico","Netherlands","Poland", "Portugal",
                         "Russian Federation","Saudi Arabia","Spain","Thailand","Turkey","Ukraine","United Arab Emirates","United Kingdom","United States Of America"]*/

    projection = d3.geoNaturalEarth1().scale(200);
    var path = d3.geoPath(projection);
    
   var path = d3.geoPath(projection);
   
   var countries = topojson.feature(worldData, worldData.objects.countries).features;

   svg.append('g')
        .attr('class', 'map geography')
        .attr('id', 'land')
        .selectAll('path')
        .data(countries)
        .join('path')
        .attr("fill", function (d) {
            if(countriesWithData.indexOf(d.properties.name) >= 0){
                return "rgb(33,113,181)";
            }
            else {
                return "gray";
            }
        })
        .on('click', d => {
            drawLineGraph(d.properties.name, inboundData)
        })
        .attr("d", path)
        .append('title')
        .text(d => d.properties.name);

   svg.append('g')
        .attr('class', 'map geography')
        .attr('id', 'borders')
        .append("path")
        .datum(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "white")
        .style('stroke-width', 1.5)
        .attr("stroke-linejoin", "round")
        .attr("d", path);

   /*
   svg.append("g")
        .attr("class", "countries-labels")
        .selectAll("text")
        .data(countries)
        .enter().append("text")
        .attr("transform", function (d) {
            return "translate(" + path.centroid(d) + ")";
        })
        .attr("dx", function (d) {
            return d.properties.dx || "0";
        })
        .attr("dy", function (d) {
            return d.properties.dy || "0.20em";
        })
        .text(function (d) {
            if(countriesWithData.indexOf(d.properties.name) >= 0){
                return d.properties.name;
            }
            else {
                return "";
            }
            
        })
        .attr('font-size', '8 pt')
        .attr("text-anchor", "middle")
        .style('pointer-events', 'none')
        .style('fill', 'black');
    */

}
