const startYear = 1995;
const endYear = 2018;

/**
 * scrollVis - encapsulates
 * all the code for the visualization
 * using reusable charts pattern:
 * http://bost.ocks.org/mike/chart/
 */
var scrollVis = function () {
    // constants to define the size
    // and margins of the vis area.
    var width = parseFloat(d3.select("#vis").style("width")) * 0.9;
    var height = 600;
    var margin = {top: 0, left: 0, bottom: 40, right: 10};
    var chartMargin = {top: 70, left: 70, bottom: 70, right: 70};

    // Keep track of which visualization
    // we are on and which was the last
    // index activated. When user scrolls
    // quickly, we want to call all the
    // activate functions that they pass.
    var lastIndex = -1;
    var activeIndex = 0;

    // main svg used for visualization
    var svg = null;

    // d3 selection that will be used
    // for displaying visualizations
    var g = null;
    var projection = null;

    var xAreaScale = d3.scaleLinear()
        .domain([startYear, endYear])
        .range([chartMargin.left, width - chartMargin.right]);

    var yAreaScale = d3.scaleLinear()
        .domain([0, 8e8])
        .range([height - chartMargin.bottom, chartMargin.top]);

    var radius = d3.scaleSqrt()
        .domain([0, 1.5e8])
        .range([0, 40]);

    // When scrolling to a new section
    // the activation function for that
    // section is called.
    var activateFunctions = [];
    // If a section has an update function
    // then it is called while scrolling
    // through the section with the current
    // progress through the section.
    var updateFunctions = [];

    var tourism = null;
    var inboundPivot = null;
    var southKoreaData = null;
    var usaData = null;
    /**
     * chart
     *
     * @param selection - the current d3 selection(s)
     *  to draw the visualization in.
     */
    var chart = function (selection) {
        selection.each(function (rawData) {
            var worldData = rawData[0];
            tourism = d3.rollup(
                rawData[1],
                d => d[0].inbound,
                d => d.year,
                d => d.country_id
            );

            southKoreaData = rawData[1].filter(d => d.country_code === "KOR");
            console.log(southKoreaData);

            usaData = rawData[1].filter(d => d.country_code === "USA");
            console.log(usaData);

            inboundPivot = rawData[2];

            // create svg and give it a width and height
            svg = d3.select(this).selectAll('svg').data([worldData]);
            var svgE = svg.enter().append('svg');
            // @v4 use merge to combine enter and existing selection
            svg = svg.merge(svgE);

            svg.attr('width', width + margin.left + margin.right);
            svg.attr('height', height + margin.top + margin.bottom);

            svg.append('g');

            // this group element will be used to contain all
            // other elements.
            g = svg.select('g');

            setupVis(worldData, tourism, inboundPivot);

            setupSections();
        });
    };


    /**
     * setupVis - creates initial elements for all
     * sections of the visualization.
     *
     * @param worldData
     * @param tourism
     * @param inboundPivot
     */
    var setupVis = function (worldData, tourism, inboundPivot) {
        // map
        // projection = d3.geoNaturalEarth1().scale(180);
        projection = d3.geoEckert3().scale(180);
        var path = d3.geoPath(projection);
        var countries = topojson.feature(worldData, worldData.objects.countries).features;

        g.append('g')
            .attr('class', 'map geography')
            .attr('id', 'land')
            .selectAll('path')
            .data(countries)
            .join('path')
            .attr("fill", "#cccccc")
            .attr("d", path)
            .append('title')
            .text(d => d.properties.name);

        // g.append("path")
        //     .datum({type: "Sphere"})
        //     .attr("id", "sphere")
        //     .attr("d", path)
        //     .attr("fill", "none")
        //     .attr("stroke", "#000000");

        g.append('g')
            .attr('class', 'map geography')
            .attr('id', 'borders')
            .append("path")
            .datum(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b))
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-linejoin", "round")
            .attr("d", path);

        g.append('g')
            .attr('class', 'map circles')
            .selectAll('circle')
            .data(countries)
            .join('circle')
            .attr('transform', d => `translate(${path.centroid(d)})`)
            .attr('stroke', '#253494')
            .attr('fill', '#41b6c4')
            .attr('opacity', '0.5')
            .attr('r', d => radius(parseFloat(tourism.get(startYear.toString()).get(d.id))));

        areaCountries = [
            'France',
            'Spain',
            'United States',
            'China',
            'Italy',
            'Turkey',
            'Mexico',
            'Germany',
            'Thailand',
            'United Kingdom',
            'Japan',
            'Austria',
            'Greece',
            'Hong Kong SAR, China',
            'Malaysia',
            'Russian Federation',
            'United Arab Emirates',
            'Canada',
            'Korea, Rep.'];

        var stacked = d3.stack()
            .keys(areaCountries)
            .order(d3.stackOrderAscending)
            (inboundPivot);

        var area = d3.area()
            .x(d => xAreaScale(parseInt(d.data.year)))
            .y0(d => yAreaScale(d[0]))
            .y1(d => yAreaScale(d[1]));

        g.append('g')
            .attr('class', 'area-chart area-lines')
            .attr('opacity', 0)
            .selectAll('path')
            .data(stacked)
            .join('path')
            .attr('fill', '#2c7fb8')
            .attr('opacity', 0.7)
            .attr('d', area);

        g.append('g')
            .attr('class', 'area-chart area-xaxis')
            .attr('transform', `translate(0, ${height - chartMargin.bottom})`)
            .call(d3.axisBottom(xAreaScale).tickFormat(d3.format("d")))
            .attr('opacity', 0);

        g.append('g')
            .attr('class', 'area-chart area-yaxis')
            .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(yAreaScale).tickFormat(d3.format(".2s")))
            .attr('opacity', 0);

        g.append('g')
            .attr('class', 'south-korea');

        g.append('g')
            .attr('class', 'usaData')
    };

    /**
     * setupSections - each section is activated
     * by a separate function. Here we associate
     * these functions to the sections based on
     * the section's index.
     *
     */
    var setupSections = function () {
        // activateFunctions are called each
        // time the active section changes
        activateFunctions = [
            showMap,
            showInitialTourism,
            animateTourism,
            showAreaChart,
            zoomInAreaChart,
            southKoreaStory,
            usaStory
        ];

        // updateFunctions are called while
        // in a particular section to update
        // the scroll progress in that section.
        // Most sections do not need to be updated
        // for all scrolling and so are set to
        // no-op functions.
        for (var i = 0; i < 9; i++) {
            updateFunctions[i] = function () {
            };
        }
        updateFunctions[7] = updateCough;
    };

    /**
     * ACTIVATE FUNCTIONS
     *
     * These will be called their
     * section is scrolled to.
     *
     * General pattern is to ensure
     * all content for the current section
     * is transitioned in, while hiding
     * the content for the previous section
     * as well as the next section (as the
     * user may be scrolling up or down).
     *
     */

    /**
     * showMap - initial map
     *
     * hides: map markings
     * (no previous step to hide)
     * shows: map geography
     *
     */
    function showMap() {
        g.selectAll('.geography')
            .transition()
            .duration(0)
            .attr('opacity', 1.0);

        g.selectAll('.circles')
            .transition()
            .duration(800)
            .attr('opacity', 0);
    }

    /**
     * showInitialTourism - show initial tourism circles
     *
     * shows: set tourism to 1995, show circles
     */
    function showInitialTourism() {
        // svg.attr('width', width / 2)
        //     .attr('height', height / 2);
        g.selectAll('.circles')
            .transition()
            .duration(800)
            .attr('opacity', 1);

        g.selectAll('.circles')
            .selectAll('circle')
            .transition()
            .duration(800)
            .attr('r', d => radius(parseFloat(tourism.get(startYear.toString()).get(d.id))));

        // g.selectAll('.map')
        //     .transition()
        //     .duration(1600)
        //     .selectAll('path')
        //     .attr("fill", "#cccccc")
        //     .attrTween("d", d3.geoPath(projection.rotate([100, 0])));

    }

    /**
     * animateTourism - animate tourism
     *
     * shows: square grid
     * shows: set map to full opacity
     * hides: area chart
     */
    function animateTourism() {
        g.selectAll('.map')
            .transition()
            .duration(600)
            .attr('opacity', 1);

        g.selectAll('.area-chart')
            .transition()
            .duration(300)
            .attr('opacity', 0);

        var year = startYear;
        var timer = setInterval(() => {
            year += 1;
            if (year === endYear) {
                clearInterval(timer)
            }
            var yearData = tourism.get(year.toString());

            g.selectAll('.circles')
                .selectAll('circle')
                .transition()
                .duration(200)
                .delay(200 * (year - startYear))
                .ease(d3.easeLinear)
                .attr('r', d => radius(yearData.get(d.id)));
        }, 0);
        // d3.select('#clock').html(attributeArray[currentAttribute]);  // update the clock
    }

    /**
     * showAreaChart - show area chart
     *
     * shows: area chart
     * hides: makes map low-opacity
     */
    function showAreaChart() {
        g.selectAll('.area-chart')
            .transition()
            .duration(600)
            .attr('opacity', 1);

        g.selectAll('.map')
            .transition()
            .duration(600)
            .attr('opacity', 0.3);

        var area = d3.area()
            .x(d => xAreaScale(parseInt(d.data.year)))
            .y0(d => yAreaScale(d[0]))
            .y1(d => yAreaScale(d[1]));

        g.selectAll('.area-lines')
            .selectAll('path')
            .transition()
            .duration(1200)
            .attr('fill', '#2c7fb8')
            .attr('d', area);

        g.select('.area-yaxis')
            .transition()
            .duration(1200)
            // .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(yAreaScale).tickFormat(d3.format(".2s")))
            .attr('opacity', 1);
    }

    /**
     * zoomInAreaChart - zoom into SK area
     *
     * shows: barchart
     */
    function zoomInAreaChart() {
        var yAreaScaleZoom = d3.scaleLinear()
            .domain([0, 2e7])
            .range([height - chartMargin.bottom, chartMargin.top]);

        var newArea = d3.area()
            .x(d => xAreaScale(parseInt(d.data.year)))
            // .y0((d, i, n) => yAreaScale((n.key === 'Korea, Rep.') ? d[0] - d[0] : 0))
            .y0(yAreaScale(0))
            .y1((d, i, n) => yAreaScaleZoom((n.key === 'Korea, Rep.') ? d[1] - d[0] : 0));

        g.select('.area-yaxis')
            .transition()
            .duration(1200)
            .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(yAreaScaleZoom).tickFormat(d3.format(".2s")));

        g.selectAll('.area-lines')
            .selectAll('path')
            .transition()
            .duration(1200)
            .attr('fill', '#b30000')
            .attr('d', newArea);
    }

    /**
     * southKoreaStory - shows the first part
     *  of the histogram of filler words
     *
     * hides: barchart
     * hides: last half of histogram
     * shows: first half of histogram
     *
     */
    function southKoreaStory() {
        g.selectAll('.area-chart,.map')
            .transition()
            .duration(600)
            .attr('opacity', 0);

        var svgGroup = g.selectAll('.south-korea');

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
            .style('font-size', '0.8em')
            .style('text-align', 'center');

        const specialYrs = ['1997', '1998', '2003', '2015', '2017', '2018'];
        const specialInfo = {
            '1997': "1997: SE/E Asia financial crisis; Korea receives $55B bailout from international agencies",
            '1998': '1998: Korea begins investing in "soft power" and cultural exports; funds Culture of Ministry and Tourism',
            '2003': "2003: N. Korea withdrawal from nuclear disarmament treaty; heightened tensions on the Korean peninsula",
            '2015': "2015: MERS outbreak causes massive disruption from May-Dec",
            '2017': "2017: Chinese ban on group travel to Korea",
            '2018': "2018: PyeongChang Winter Olympics in Korea; continued partial travel ban from China through Aug"
        };

        var dataToDisplayOnMouseOver = {};
        southKoreaData.forEach(d => {
            if (specialYrs.indexOf(d.year) >= 0) {
                dataToDisplayOnMouseOver[d.year] = specialInfo[d.year];
            } else {
                dataToDisplayOnMouseOver[d.year] = d.year;
            }
        });

        var x = d3.scaleTime().range([chartMargin.left, width - chartMargin.right]);
        var y = d3.scaleLinear().range([height - chartMargin.bottom, chartMargin.top]);

        var line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.inbound))
            .curve(d3.curveNatural);

        // Scale the range of the data
        x.domain(d3.extent(southKoreaData, d => d.year));
        max_visitors = d3.max(southKoreaData, d => d.inbound);
        y.domain([0, 2e7]); // round up to nearest million for a clean y-axis


        // Add the line
        svgGroup.append("path")
            .data([southKoreaData])
            .style('stroke', "blue")
            .style("fill", "none")
            .attr("d", line);

        // Appends a circle for each datapoint
        svgGroup.selectAll(".dot")
            .data(southKoreaData)
            .enter().append("circle") // Uses the enter().append() method
            .attr("class", "dot") // Assign a class for styling
            .attr("cx", function (d) {
                return x(d.year)
            })
            .attr("cy", function (d) {
                return y(d.inbound)
            })
            .attr("r", function (d) {
                if (specialYrs.indexOf(d.year) >= 0) {
                    return 5;
                } else {
                    return 2.5;
                }

            }) // make dots for 'special years' larger (will re-color next) to direct the readers' attention
            .style("fill", function (d) {
                if (specialYrs.indexOf(d.year) >= 0) {
                    return "red";
                } else {
                    return "blue";
                }

            }) // make dots for 'special years' red to direct the readers' attention
            .on("mouseover", function (d) {
                dataToDisplay = dataToDisplayOnMouseOver[d.year];
                tooltip.html("<b><u>" + dataToDisplay + "</b></u>"
                    + "<br />" + 'International Visitors: ' + d.inbound.toLocaleString()); // show the year, any special information, & the # int'l visitors
                return tooltip.transition().duration(tooltipDuration)
                    .style("visibility", "visible")
                    .style("top", (d3.event.pageY - 10) + "px")
                    .style("left", (d3.event.pageX + 10) + "px");
            })
            .on("mouseout", function () {
                return tooltip.style("visibility", "hidden");
            });

        // Add the X Axis
        svgGroup.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height - chartMargin.bottom})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.4em")
            .attr("dy", ".15em");

        // Add the Y Axis
        svgGroup.append("g")
            .attr("class", "axis")
            .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));


        /* Add 'curtain' rectangle to hide entire graph */
        var curtain = svg.append('rect')
            .attr('x', -1 * width)
            .attr('y', -1 * height)
            .attr('height', height + 5)
            .attr('width', width - 5)
            .attr('class', 'curtain')
            .attr('transform', 'rotate(180)')
            .style('fill', '#ffffff')

        /* Creating a transition of the curtain to give an animation impression */
        curtain.transition()
            .duration(6000)
            .ease(d3.easeLinear)
            .attr('x', -2 * width);
    }

    /**
     * usaStory - presents the inbound travel patterns
     * in the past 25 years
     *
     */
    function usaStory() {
        g.selectAll('.area-chart,.map,.south-korea')
            .transition()
            .duration(600)
            .attr('opacity', 0);

        var svgGroup = g.selectAll('.usaData');

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
            .style('font-size', '0.8em')
            .style('text-align', 'center')

        specialYrs = ['1997', '2001', '2003', '2008', '2009'];
        specialInfo = {
            '1997': "1997: Congress stopped funding for U.S. Travel and Tourism Advisory Board (USTTAB) that promoted US Tourism",
            '2001': "2001: 9/11 Incident",
            '2003': "2003: Congress re-established the U.S. Travel and Tourism Advisory Board (USTTAB)",
            '2008': "2008: Financial Crisis",
            '2009': "2009: Lawmakers established a public-private entity to promote U.S. tourism, the Corporation for Trade Promotion, which does business as Brand USA"
        };

        var dataToDisplayOnMouseOver = {};
        usaData.forEach(d => {
            if (specialYrs.indexOf(d.year) >= 0) {
                dataToDisplayOnMouseOver[d.year] = specialInfo[d.year];
            } else {
                dataToDisplayOnMouseOver[d.year] = d.year;
            }
        });

        var x = d3.scaleTime().range([chartMargin.left, width - chartMargin.right]);
        var y = d3.scaleLinear().range([height - chartMargin.bottom, chartMargin.top]);

        var line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.inbound))
            .curve(d3.curveNatural);

        // Scale the range of the data
        x.domain(d3.extent(usaData, d => d.year));
        max_visitors = d3.max(usaData, d => d.inbound);
        y.domain([0, Math.ceil(max_visitors / 1000000) * 1000000]); // round up to nearest million for a clean y-axis


        // Add the line
        svgGroup.append("path")
            .data([usaData])
            .style('stroke', "blue")
            .style("fill", "none")
            .attr("d", line);

        // Appends a circle for each datapoint
        svgGroup.selectAll(".dot")
            .data(usaData)
            .enter().append("circle") // Uses the enter().append() method
            .attr("class", "dot") // Assign a class for styling
            .attr("cx", function (d) {
                return x(d.year)
            })
            .attr("cy", function (d) {
                return y(d.inbound)
            })
            .attr("r", function (d) {
                if (specialYrs.indexOf(d.year) >= 0) {
                    return 5;
                } else {
                    return 2.5;
                }

            }) // make dots for 'special years' larger (will re-color next) to direct the readers' attention
            .style("fill", function (d) {
                if (specialYrs.indexOf(d.year) >= 0) {
                    return "red";
                } else {
                    return "blue";
                }

            }) // make dots for 'special years' red to direct the readers' attention
            .on("mouseover", function (d) {
                dataToDisplay = dataToDisplayOnMouseOver[d.year];
                tooltip.html("<b><u>" + dataToDisplay + "</b></u>"
                    + "<br />" + 'International Visitors: ' + d.inbound.toLocaleString()); // show the year, any special information, & the # int'l visitors
                return tooltip.transition().duration(tooltipDuration)
                    .style("visibility", "visible")
                    .style("top", (d3.event.pageY - 10) + "px")
                    .style("left", (d3.event.pageX + 10) + "px");
            })
            .on("mouseout", function () {
                return tooltip.style("visibility", "hidden");
            });

        // Add the X Axis
        svgGroup.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height - chartMargin.bottom})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.4em")
            .attr("dy", ".15em");

        // Add the Y Axis
        svgGroup.append("g")
            .attr("class", "axis")
            .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));


        /* Add 'curtain' rectangle to hide entire graph */
        var curtain = svg.append('rect')
            .attr('x', -1 * width)
            .attr('y', -1 * height)
            .attr('height', height + 5)
            .attr('width', width - 5)
            .attr('class', 'curtain')
            .attr('transform', 'rotate(180)')
            .style('fill', '#ffffff')

        /* Creating a transition of the curtain to give an animation impression */
        curtain.transition()
            .duration(6000)
            .ease(d3.easeLinear)
            .attr('x', -2 * width);

    }

    /**
     * UPDATE FUNCTIONS
     *
     * These will be called within a section
     * as the user scrolls through it.
     *
     * We use an immediate transition to
     * update visual elements based on
     * how far the user has scrolled
     *
     */

    /**
     * updateCough - increase/decrease
     * cough text and color
     *
     * @param progress - 0.0 - 1.0 -
     *  how far user has scrolled in section
     */
    function updateCough(progress) {
        g.selectAll('.cough')
            .transition()
            .duration(0)
            .attr('opacity', progress);

        g.selectAll('.hist')
            .transition('cough')
            .duration(0)
            .style('fill', function (d) {
                return (d.x0 >= 14) ? coughColorScale(progress) : '#008080';
            });
    }

    /**
     * activate -
     *
     * @param index - index of the activated section
     */
    chart.activate = function (index) {
        activeIndex = index;
        var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
        var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
        scrolledSections.forEach(function (i) {
            activateFunctions[i]();
        });
        lastIndex = activeIndex;
    };

    /**
     * update
     *
     * @param index
     * @param progress
     */
    chart.update = function (index, progress) {
        updateFunctions[index](progress);
    };

    // return chart function
    return chart;
};


/**
 * display - called once data
 * has been loaded.
 * sets up the scroller and
 * displays the visualization.
 *
 * @param data - loaded tsv data
 */
function display(data) {

    // create a new plot and
    // display it
    var plot = scrollVis();

    // this passes the d3 selection to the plot() function, which is the chart() function
    // created above
    d3.select('#vis')
        .datum(data)
        .call(plot);

    // setup scroll functionality
    var scroll = scroller()
        .container(d3.select('#graphic'));

    // pass in .step selection as the steps
    scroll(d3.selectAll('.step'));

    // setup event handling
    scroll.on('active', function (index) {
        // highlight current step text
        d3.selectAll('.step')
            .style('opacity', function (d, i) {
                return i === index ? 1 : 0.1;
            });

        // activate current section
        plot.activate(index);
    });

    scroll.on('progress', function (index, progress) {
        plot.update(index, progress);
    });
}

// load data and display

var promises = [
    d3.json('data/countries-50m.json'),
    d3.csv('data/tourism.csv'),
    d3.csv('data/inbound_pivot.csv')
];
Promise.all(promises).then(display);