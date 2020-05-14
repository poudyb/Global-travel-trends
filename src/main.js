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

    var yAreaScaleKorea = d3.scaleLinear()
        .domain([0, 2e7])
        .range([height - chartMargin.bottom, chartMargin.top]);

    var yAreaScaleUsa = d3.scaleLinear()
        .domain([0, 8e7])
        .range([height - chartMargin.bottom, chartMargin.top]);

    var radius = d3.scaleSqrt()
        .domain([0, 1.5e8])
        .range([0, 40]);

    var circleColor = d3.scaleSequential()
        .domain([0, 1e8])
        .interpolator(d3.interpolateBlues);

    var scrollScale = d3.scaleLinear()
        .domain([0, 1])
        .range([startYear, endYear]);

    var clickFlag = false;
    var tooltipDuration = 100;
    var textDuration = 600;

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
    var worldData = null;
    var inboundTourism = null;
    /**
     * chart
     *
     * @param selection - the current d3 selection(s)
     *  to draw the visualization in.
     */
    var chart = function (selection) {
        selection.each(function (rawData) {
            worldData = rawData[0];
            tourism = d3.rollup(
                rawData[1],
                d => d[0].inbound,
                d => d.year,
                d => d.country_id
            );

            southKoreaData = rawData[1].filter(d => d.country_code === "KOR");

            usaData = rawData[1].filter(d => d.country_code === "USA");
            inboundTourism = rawData[1];
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

        var interactiveLineChart = g.append('g')
            .attr('class', 'interactive-line')
            .attr('opacity', 0);

        interactiveLineChart
            .append("rect")
            .attr('class', 'background');
        interactiveLineChart
            .append("text")
            .attr('class', 'country-label');
        interactiveLineChart
            .append("path")
            .attr('class', 'line');
        interactiveLineChart
            .append('g')
            .attr('class', 'x-axis');
        interactiveLineChart
            .append('g')
            .attr('class', 'y-axis');

        g.append('g')
            .attr('class', 'map geography')
            .attr('id', 'land')
            .selectAll('path')
            .data(countries)
            .join('path')
            .attr("fill", "#bbbbbb")
            .attr("d", path)
            // .append('title')
            // .text(d => d.properties.name)
            .on("click", function (d) {
                if (activeIndex === 10) {
                    var chartMarginInt = {top: 30, left: 40, bottom: 30, right: 20};
                    var widthInt = 350;
                    var heightInt = 250;
                    var countryData = inboundTourism.filter(data => data.country_id === d.id);


                    var xAreaScaleInt = d3.scaleTime()
                        .domain(d3.extent(countryData, d => d.year))
                        .range([chartMarginInt.left, (widthInt - chartMarginInt.right)]);

                    var yAreaScaleInt = d3.scaleLinear()
                        .domain([0, 1.1 * d3.max(countryData, d => parseInt(d.inbound))])
                        .range([(heightInt - chartMarginInt.bottom), chartMarginInt.top]);

                    var line = d3.line()
                        .x(d => xAreaScaleInt(parseInt(d.year)))
                        .y(d => yAreaScaleInt(parseInt(d.inbound) || 0));

                    var loc = d3.mouse(this);
                    var xTranslate = Math.min(loc[0], width - widthInt);
                    var yTranslate = Math.min(loc[1], height - heightInt);

                    interactiveLineChart
                        .attr('opacity', 1)
                        .attr('transform', `translate(${xTranslate},${yTranslate})`)
                        .raise();

                    interactiveLineChart.select('.background')
                        .attr('width', widthInt)
                        .attr('height', heightInt)
                        .attr('fill', '#eeeeee')
                        .attr('stroke', '#444444')
                        .attr('opacity', 0.9)
                        .attr('rx', '3px');

                    interactiveLineChart.select('.country-label')
                        .attr('transform', `translate(10, 20)`)
                        .attr('font-size', '13px')
                        .attr('font-weight', 'bold')
                        .text(`${d.properties.name} Inbound Visitors`);

                    interactiveLineChart.select('path')
                        .data([countryData])
                        .style('stroke', "#253494")
                        .style("fill", "none")
                        .attr("d", line);

                    // Add the X Axis
                    interactiveLineChart.select('.x-axis')
                        .attr("transform", `translate(0,${heightInt - chartMarginInt.bottom})`)
                        .call(d3.axisBottom(xAreaScaleInt).tickFormat(d3.format("d")))
                        .selectAll("text")
                        .style("text-anchor", "end");

                    // Add the Y Axis
                    interactiveLineChart.select('.y-axis')
                        .attr('transform', `translate(${chartMarginInt.left}, 0)`)
                        .call(d3.axisLeft(yAreaScaleInt).tickFormat(d3.format(".2s")));

                    interactiveLineChart.selectAll("circle")
                        .data(countryData)
                        .join("circle") // Uses the enter().append() method
                        .attr("cx", d => xAreaScaleInt(parseInt(d.year)))
                        .attr("cy", d => yAreaScaleInt(parseInt(d.inbound) || 0))
                        .attr("r", 2.5)
                        .style("fill", "#253494");
                }
            });

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

        g.append('text')
            .attr('class', 'map marks year')
            .attr('x', 30)
            .attr('y', 30)
            .attr('font-weight', 'bold')
            .attr('fill', '#696969')
            .text(startYear);

        g.append('g')
            .attr('class', 'map marks legend')
            .attr('transform', 'translate(70, 400)')
            .call(circleLegend()
                .scale(radius)
                .tickValues([1e6, 1e7, 1e8])
                .tickExtend(15)
                .tickFormat(d3.format(".1s"))
                .orient('right'));

        g.append('g')
            .attr('class', 'map marks circles')
            .selectAll('circle')
            .data(countries)
            .join('circle')
            .attr('transform', d => `translate(${path.centroid(d)})`)
            .attr('stroke', '#253494')
            .attr('fill', '#2c7fb8')
            .attr('opacity', '0.7')
            .attr('r', d => radius(parseFloat(tourism.get(startYear.toString()).get(d.id))));


        /* Area chart */
        var areaTooltip = d3.select("#vis")
            .append("div")
            .attr("id", "tooltip")
            // .style('width', "50px")
            .style('opacity', "0")
            .style("position", "absolute")
            .style("z-index", "15")
            .style("visibility", "hidden")
            .style("background", "#eeeeee")
            .style('padding', '5px')
            .style('border', '2px solid grey')
            .style('border-radius', '5px')
            .style('font-size', '14px')
            .style('text-align', 'center');

        var areaCountries = [
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
            'Korea, Rep.',
            'Singapore'];

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
            .attr('class', 'area-path')
            .attr('fill', '#2c7fb8')
            .attr('opacity', 0.8)
            .attr('d', area)
            .on('mouseover', function (d) {
                if (activeIndex === 3) {
                    var yVal = (d[d.length - 1][0] + d[d.length - 1][1]) / 2;
                    var yPos = yAreaScale(yVal);
                    d3.select(this)
                        .transition()
                        .duration(0)
                        .attr('fill', '#cccccc')
                        .attr('stroke', '#444');

                    areaTooltip
                        .transition()
                        .duration(10)
                        .text(d.key)
                        .style("visibility", "visible")
                        .style("left", `${width - 50}px`)
                        .style("top", yPos + "px")
                }
            })
            .on('mouseout', function () {
                if (activeIndex === 3) {
                    d3.select(this)
                        .transition()
                        .duration(0)
                        .attr('fill', '#2c7fb8')
                        .attr('stroke', null);
                }
            });

        g.selectAll('.area-lines')
            .on('mouseout', function () {
                areaTooltip.style("visibility", "hidden")
            });

        g.append('g')
            .attr('class', 'area-chart area-xaxis')
            .attr('transform', `translate(0, ${height - chartMargin.bottom})`)
            .call(d3.axisBottom(xAreaScale).tickFormat(d3.format("d")))
            .attr('opacity', 0);

        g.append('g')
            .attr('class', 'area-chart area-yaxis')
            .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(yAreaScale).tickFormat(d3.format(".2s")))
            .call(g => g.select(".tick:last-of-type text").clone()
                .attr("x", 5)
                .attr("text-anchor", "start")
                .attr("font-weight", "bold")
                .text("Inbound visitors"))
            .attr('opacity', 0);

        g.append('g')
            .attr('class', 'south-korea')
            .attr('opacity', 0);

        var line = d3.line()
            .x(d => xAreaScale(d.year))
            .y(d => yAreaScaleKorea(d.inbound));

        var storyToolTipWidth = 200;
        var storyTooltip = d3.select("body")
            .append("div")
            .attr("class", "story-tooltip")
            .style('width', storyToolTipWidth + "px")
            .style("position", "absolute")
            .style("z-index", "15")
            .style("visibility", "hidden")
            .style("background", "#eeeeee")
            .style('padding', '7px')
            .style('border', '2px solid grey')
            .style('border-radius', '3px')
            .style('font-size', '16px')
            .style('text-align', 'left')
            .style('opacity', 0);

        var storyText = d3.select("#vis")
            .append("div")
            .attr("id", "story-text")
            .attr("class", "story-tooltip")
            .style("visibility", "hidden")
            .style("position", "absolute")
            .style("left", `${chartMargin.left + width * 0.07}px`)
            .style('top', `${chartMargin.top}px`)
            .style('width', (width * 0.6) + "px")
            .style("background", "#ffffff")
            .style('padding', '10px')
            .style('border', '2px solid grey')
            .style('border-radius', '1px')
            .style('text-align', 'left')
            .style('font-size', '12px')
            .style('opacity', 0);

        g.selectAll('.south-korea')
            .append("path")
            .data([southKoreaData])
            .attr("class", "line-path")
            .attr('stroke', "#253494")
            .attr('fill', 'none')
            .attr("stroke-width", "3px")
            .attr("d", line);

        g.selectAll('.south-korea')
            .selectAll("circle")
            .data(southKoreaData)
            .join("circle")
            .attr("cx", d => xAreaScale(d.year))
            .attr("cy", d => yAreaScaleKorea(d.inbound))
            .attr("r", d => sKoreaYears.indexOf(d.year) >= 0 ? 8 : 4)
            .attr("fill", d => sKoreaYears.indexOf(d.year) >= 0 ? "#bd0026" : "#253494")
            .on("mouseover", function (d) {
                var dataToDisplay = sKoreaShort[d.year] || d.year;
                storyTooltip.html("<b><u>" + dataToDisplay + "</b></u>"
                    + "<br />" + 'Inbound Visitors: '
                    + d3.format('.2s')(parseInt(d.inbound))); // show the year, any special information, & the # int'l visitors
                storyTooltip
                    .transition()
                    .duration(tooltipDuration)
                    .style("visibility", "visible")
                    .style("top", (d3.event.pageY - 75) + "px")
                    .style("left", (d3.event.pageX - storyToolTipWidth - 10) + "px")
            })
            .on("mouseout", function () {
                storyTooltip.style("visibility", "hidden");
            })
            .on('click', d => {
                var selectedYr = d.year;
                var dataToDisplay = sKoreaDetail[d.year];

                if (sKoreaYears.indexOf(d.year) >= 0) {
                    storyText.html("<b><u>"
                        + "Korea's Tourism Story: " + selectedYr + "</b></u>"
                        + "<br />" + dataToDisplay
                    ); // show the long text for that year
                    storyText
                        .transition()
                        .duration(textDuration)
                        .style("visibility", "visible");
                } else {
                    storyText
                        .transition()
                        .duration(textDuration)
                        .style("visibility", "hidden");
                }
            });

        g.append('g')
            .attr('class', 'usa')
            .attr('opacity', 0);

        g.selectAll('.usa')
            .append("path")
            .data([usaData])
            .attr("class", "line-path")
            .attr('stroke', "#253494")
            .attr('fill', 'none')
            .attr("stroke-width", "3px")
            .attr("d", line);

        g.selectAll('.usa')
            .selectAll("circle")
            .data(usaData)
            .join("circle")
            .attr("cx", d => xAreaScale(d.year))
            .attr("cy", d => yAreaScaleUsa(d.inbound))
            .attr("r", d => usaYears.indexOf(d.year) >= 0 ? 8 : 4)
            .attr("fill", d => usaYears.indexOf(d.year) >= 0 ? "#bd0026" : "#253494")
            .on("mouseover", function (d) {
                var dataToDisplay = usaShort[d.year] || d.year;
                storyTooltip.html("<b><u>" + dataToDisplay + "</b></u>"
                    + "<br />" + 'Inbound Visitors: '
                    + d3.format('.2s')(parseInt(d.inbound))); // show the year, any special information, & the # int'l visitors

                storyTooltip
                    .transition()
                    .duration(tooltipDuration)
                    .style("visibility", "visible")
                    .style("top", (d3.event.pageY - 75) + "px")
                    .style("left", (d3.event.pageX - storyToolTipWidth - 10) + "px")
            })
            .on("mouseout", function () {
                storyTooltip.style("visibility", "hidden");
            })
            .on('click', d => {
                var selectedYr = d.year;
                var dataToDisplay = usaDetail[d.year];

                if (usaYears.indexOf(d.year) >= 0) {
                    storyText.html("<b><u>"
                        + "USA's Tourism Story: " + selectedYr + "</b></u>"
                        + "<br />" + dataToDisplay
                    ); // show the long text for that year
                    storyText
                        .transition()
                        .duration(textDuration)
                        .style("visibility", "visible");
                } else {
                    storyText
                        .transition()
                        .duration(textDuration)
                        .style("visibility", "hidden");
                }
            });

        var sKoreaCircles = g.selectAll('.south-korea').selectAll('circle');
        var usaCircles = g.selectAll('.usa').selectAll('circle');
        var countryPaths = g.selectAll('#land').selectAll('path');
        g.on("click", function () {
            if (activeIndex == 10) {
                if (!countryPaths.nodes().includes(d3.event.target)) {
                    interactiveLineChart
                        .attr('opacity', 0)
                }
            } else {
                if (!sKoreaCircles.nodes().includes(d3.event.target)
                    && !usaCircles.nodes().includes(d3.event.target)
                ) {
                    storyText
                        .transition()
                        .duration(textDuration)
                        .style("visibility", "hidden");
                }
            }
        });
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
        activateFunctions = [];
        activateFunctions[0] = showMap;
        activateFunctions[1] = showInitialTourism;
        activateFunctions[2] = animateTourism;
        activateFunctions[3] = showAreaChart;
        activateFunctions[4] = zoomInSouthKorea;
        activateFunctions[5] = southKoreaScroll;
        activateFunctions[6] = southKoreaClick;
        activateFunctions[7] = zoomInUsa;
        activateFunctions[8] = usaScroll;
        activateFunctions[9] = usaClick;
        activateFunctions[10] = showInteractiveMap;

        // updateFunctions are called while
        // in a particular section to update
        // the scroll progress in that section.
        // Most sections do not need to be updated
        // for all scrolling and so are set to
        // no-op functions.
        for (var i = 0; i < 11; i++) {
            updateFunctions[i] = function () {
            };
        }
        updateFunctions[5] = updateSouthKorea;
        updateFunctions[8] = updateUsa;

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

        g.selectAll('.marks')
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
        g.selectAll('.marks')
            .transition()
            .duration(800)
            .attr('opacity', 1.0);

        g.selectAll('.year')
            .transition()
            .duration(800)
            .attr('opacity', 1.0)
            .text(startYear);

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
            .duration(600)
            .attr('opacity', 0);

        d3.select("#tooltip")
            .transition()
            .duration(600)
            .style('opacity', 0);

        var year = startYear;
        var timer = setInterval(() => {
            year += 1;
            if (year === endYear) {
                clearInterval(timer)
            }
            var yearData = tourism.get(year.toString());

            var yearDuration = 150;
            g.selectAll('.year')
                .transition()
                .duration(yearDuration)
                .delay(yearDuration * (year - startYear))
                .text(year);

            g.selectAll('.circles')
                .selectAll('circle')
                .transition()
                .duration(yearDuration)
                .delay(yearDuration * (year - startYear))
                .ease(d3.easeLinear)
                // .attr('fill', d => circleColor(yearData.get(d.id)))
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

        d3.select("#tooltip")
            .transition()
            .duration(600)
            .style('opacity', 1);

        g.selectAll('.map')
            .transition()
            .duration(600)
            .attr('opacity', 0.2);

        var area = d3.area()
            .x(d => xAreaScale(parseInt(d.data.year)))
            .y0(d => yAreaScale(d[0]))
            .y1(d => yAreaScale(d[1]));

        g.selectAll('.area-lines')
            .selectAll('path')
            .transition("area")
            .duration(1200)
            .attr('fill', '#2c7fb8')
            .attr('d', area);

        g.select('.area-yaxis')
            .transition("axis")
            .duration(1200)
            .call(d3.axisLeft(yAreaScale).tickFormat(d3.format(".2s")))
            .attr('opacity', 1);
    }

    /**
     * zoomInSouthKorea - zoom into SK area
     *
     * shows: barchart
     */
    function zoomInSouthKorea() {
        var newArea = d3.area()
            .x(d => xAreaScale(parseInt(d.data.year)))
            .y0(yAreaScale(0))
            .y1((d, i, n) => yAreaScaleKorea((n.key === 'Korea, Rep.') ? d[1] - d[0] : 0));

        g.select('.area-yaxis')
            .transition("axis")
            .duration(1200)
            .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(yAreaScaleKorea).tickFormat(d3.format(".2s")));

        g.selectAll('.area-lines')
            .selectAll('path')
            .transition("area")
            .duration(1200)
            .attr('fill', '#888')
            .attr('d', newArea);

        g.selectAll('.south-korea')
            .transition()
            .duration(600)
            .attr('opacity', 0)
    }

    /**
     * southKoreaScroll - shows the first part
     *  of the histogram of filler words
     *
     * hides: barchart
     * hides: last half of histogram
     * shows: first half of histogram
     *
     */

    function southKoreaScroll() {
        updateSouthKorea(0);

        g.selectAll('.south-korea')
            .transition()
            .duration(600)
            .attr('opacity', 1);

        d3.selectAll('div.story-tooltip')
            .transition()
            .duration(600)
            .style('opacity', 1);
    }

    function southKoreaClick() {
        g.selectAll('.south-korea')
            .transition()
            .duration(600)
            .attr('opacity', 1);

        d3.selectAll('div.story-tooltip')
            .transition()
            .duration(600)
            .style('opacity', 1);

        updateSouthKorea(1);

        var newArea = d3.area()
            .x(d => xAreaScale(parseInt(d.data.year)))
            .y0(yAreaScale(0))
            .y1((d, i, n) => yAreaScaleKorea((n.key === 'Korea, Rep.') ? d[1] - d[0] : 0));

        g.select('.area-yaxis')
            .transition("axis")
            .duration(1200)
            .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(yAreaScaleKorea).tickFormat(d3.format(".2s")));

        g.selectAll('.area-lines')
            .selectAll('path')
            .transition("area")
            .duration(1200)
            .attr('fill', '#888')
            .attr('d', newArea);
    }

    /**
     * zoomInUsa - presents the inbound travel patterns
     * in the past 25 years
     *
     */
    function zoomInUsa() {
        // g.selectAll('.area-chart,.map,.south-korea,rect')
        //     .transition()
        //     .duration(600)
        //     .attr('opacity', 0);
        g.selectAll('.south-korea')
            .transition()
            .duration(600)
            .attr('opacity', 0);

        d3.selectAll('div.story-tooltip')
            .transition()
            .duration(600)
            .style('opacity', 0);

        var newArea = d3.area()
            .x(d => xAreaScale(parseInt(d.data.year)))
            .y0(yAreaScale(0))
            .y1((d, i, n) => yAreaScaleUsa((n.key === 'United States') ? d[1] - d[0] : 0));

        g.select('.area-yaxis')
            .transition("axis")
            .duration(1200)
            .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(yAreaScaleUsa).tickFormat(d3.format(".2s")));

        g.selectAll('.area-lines')
            .selectAll('path')
            .transition("area")
            .duration(1200)
            .attr('fill', '#888')
            .attr('d', newArea);

        g.selectAll('.usa')
            .transition()
            .duration(600)
            .attr('opacity', 0);
    }

    function usaScroll() {
        updateUsa(0);

        g.selectAll('.usa')
            .transition()
            .duration(600)
            .attr('opacity', 1);

        d3.selectAll('div.story-tooltip')
            .transition()
            .duration(600)
            .style('opacity', 1)
            .style('visibility', 'hidden');
    }

    function usaClick() {
        updateUsa(1);

        g.selectAll('.area-chart')
            .transition()
            .duration(600)
            .attr('opacity', 1);

        g.selectAll('.usa')
            .transition()
            .duration(600)
            .attr('opacity', 1);

        d3.selectAll('div.story-tooltip')
            .transition()
            .duration(600)
            .style('opacity', 1);

        g.selectAll('.map.geography').lower();
        g.selectAll('.map')
            .transition()
            .duration(600)
            .attr('opacity', 0.2);
        g.select('#land').selectAll('path')
            .transition()
            .duration(600)
            .attr('fill', "#bbbbbb");

        g.selectAll('.interactive-line')
            .transition()
            .duration(600)
            .attr('opacity', 0);
    }

    function showInteractiveMap() {
        console.log(activeIndex);
        g.selectAll('.area-chart,.south-korea,.usa,.map.marks')
            .transition()
            .duration(600)
            .attr('opacity', 0);

        d3.selectAll('div.story-tooltip')
            .transition()
            .duration(600)
            .style('opacity', 0);

        var countriesWithData = d3.set(inboundTourism.map(d => d.country_id)).values();
        g.selectAll('.map.geography').transition()
            .duration(600)
            .attr('opacity', 1);
        g.select('#land').raise();
        g.selectAll('#borders').raise();

        g.select('#land').selectAll('path')
            .transition()
            .duration(600)
            .attr('fill', d => countriesWithData.indexOf(d.id) >= 0 ? "#2c7fb8" : "#bbbbbb")
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
     * updateSouthKorea - increase/decrease span of line
     *
     *
     * @param progress - 0.0 - 1.0 -
     *  how far user has scrolled in section
     */
    function updateSouthKorea(progress) {
        var line = d3.line()
            .x(d => xAreaScale(d.year))
            .y(d => yAreaScaleKorea(d.inbound));

        var partialData = southKoreaData.filter(d => d.year <= scrollScale(progress));

        g.selectAll('.south-korea').selectAll("path")
            .data([partialData])
            .transition()
            .duration(10)
            .attr('stroke', "#253494")
            .attr('fill', 'none')
            .attr("stroke-width", "3px")
            .attr("d", line);

        g.selectAll('.south-korea')
            .selectAll("circle")
            .transition()
            .duration(10)
            .attr("opacity", d => d.year <= scrollScale(progress) ? 1 : 0);
    }

    function updateUsa(progress) {
        var line = d3.line()
            .x(d => xAreaScale(d.year))
            .y(d => yAreaScaleUsa(d.inbound));

        var partialData = usaData.filter(d => d.year <= scrollScale(progress));

        g.selectAll('.usa').selectAll("path")
            .data([partialData])
            .transition()
            .duration(10)
            .attr('stroke', "#253494")
            .attr('fill', 'none')
            .attr("stroke-width", "3px")
            .attr("d", line);

        g.selectAll('.usa')
            .selectAll("circle")
            .transition()
            .duration(10)
            .attr("opacity", d => d.year <= scrollScale(progress) ? 1 : 0);
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