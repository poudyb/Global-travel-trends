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
    var interactiveMapData = null;
    var inboundTourism = null;
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
            inboundTourism = rawData[1];
            interactiveMapData = rawData[0];

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
            .attr("fill", "#bbbbbb")
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
            .style("left", `${chartMargin.left + 50}px`)
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

                console.log('event y is', d3.event.pageY);
                console.log('height is', height);
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

        /* aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa */
        // southKoreaData.forEach(d => {
        //     if (sKoreaYears.indexOf(d.year) >= 0) {
        //         sKoreaShort[d.year] = sKoreaShort[d.year];
        //     } else {
        //         sKoreaShort[d.year] = d.year;
        //     }
        // });

        // var x = d3.scaleTime().range([chartMargin.left, (newChartWidth - chartMargin.right)]);
        // var y = d3.scaleLinear().range([(height - chartMargin.bottom), chartMargin.top]);


        // Scale the range of the data
        // x.domain(d3.extent(southKoreaData, d => d.year));
        // max_visitors = d3.max(southKoreaData, d => d.inbound);
        // y.domain([0, 2e7]); // round up to nearest million for a clean y-axis

        // Add variable to determine if data point clicked or not (so tooltip stays until second click)
        // var clickFlag = false;


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

                console.log('event y is', d3.event.pageY);
                console.log('height is', height);
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
        g.on("click", function() {
            if (!sKoreaCircles.nodes().includes(d3.event.target)
                && !usaCircles.nodes().includes(d3.event.target)
            ){
                storyText
                    .transition()
                    .duration(textDuration)
                    .style("visibility", "hidden");
            }
        });

        g.append('g')
            .attr('class', 'interactiveMap')
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

        console.log("axis", g.select('.area-yaxis'));
        console.log(g.select('.area-yaxis').select(".tick:last-of-type text"));

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
        updateSouthKorea(1)
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
            .style('opacity', 1);
    }

    function usaClick() {
        updateUsa(1);

        g.selectAll('.area-chart')
            .transition()
            .duration(600)
            .attr('opacity', 1);
    }

    function showInteractiveMap() {
        g.selectAll('.area-chart,.map,.south-korea,.usaData, rect')
            .transition()
            .duration(600)
            .attr('opacity', 0);
        svg.selectAll("rect").remove();

        var svgGroup = g.selectAll('.interactiveMap');

        var newChartWidth = width * 0.5;
        var newChartHeight = height * 0.5;

        countriesWithData = []

        inboundTourism.forEach(function (d) {
            if (countriesWithData.indexOf(d.country_id) == -1) {
                countriesWithData.push(d.country_id)
            }
        })
        console.log("the countries are", countriesWithData);

        projection = d3.geoNaturalEarth1().scale(200);

        var path = d3.geoPath(projection);

        var path = d3.geoPath(projection);

        var countries = topojson.feature(interactiveMapData, interactiveMapData.objects.countries).features;

        // define the tooltip
        var tool_tip = d3.tip()
            .attr("class", "d3-tip")
            .style("left", (400 + newChartWidth) + "px")
            // include the div
            .html(
                "<div id='tipDiv'></div>"
            );

        svgGroup.call(tool_tip);

        svgGroup.append('g')
            .attr('class', 'map geography')
            .attr('id', 'land')
            .selectAll('path')
            .data(countries)
            .join('path')
            .attr("fill", function (d) {

                if (countriesWithData.indexOf(d.id) >= 0) {
                    return "rgb(33,113,181)";
                } else {
                    return "gray";
                }
            })
            .on("mouseover", function (d) {
                // get the name of the country
                g.selectAll('.interactiveMap')
                    .attr('opacity', 0.3);
                current_country = d.id
                // show the tooltip
                tool_tip.show();

                var tipSVG = d3.select("#tipDiv")
                    .append("svg")
                    .attr("width", newChartWidth)
                    .attr("height", newChartHeight);
                //.style("left", (400 + newChartWidth) + "px");

                var parseDate = d3.timeParse("%Y");

                var selectedCountryInbound = inboundTourism.filter(function (d) {
                    return d.country_id === current_country;
                });

                selectedCountryInbound.forEach(function (d) {
                    d.year = d.year;
                    d.inbound = +d.inbound || 0
                    d.inbound = parseInt(d.inbound);
                });

                var x = d3.scaleTime().range([0.5 * chartMargin.left, (newChartWidth - chartMargin.right)]);
                var y = d3.scaleLinear().range([0.5 * (height - chartMargin.bottom), 0.5 * chartMargin.top]);

                var line = d3.line()
                    .x(d => x(d.year))
                    .y(d => y(d.inbound))
                    .curve(d3.curveNatural);

                // Scale the range of the data
                x.domain(d3.extent(selectedCountryInbound, d => d.year));
                max_visitors = d3.max(selectedCountryInbound, d => d.inbound);
                y.domain([0, Math.ceil(max_visitors / 1000000) * 1000000]); // round up to nearest million for a clean y-axis

                // Add the line
                tipSVG.append("path")
                    .data([selectedCountryInbound])
                    .style('stroke', "blue")
                    .style("fill", "none")
                    .attr("d", line);

                // Appends a circle for each datapoint
                tipSVG.selectAll(".dot")
                    .data(selectedCountryInbound)
                    .enter().append("circle") // Uses the enter().append() method
                    .attr("class", "dot") // Assign a class for styling
                    .attr("cx", function (d) {
                        return x(d.year)
                    })
                    .attr("cy", function (d) {
                        return y(d.inbound)
                    })
                    .attr("r", 2.5)
                    .style("fill", "blue");

                // Add the X Axis
                tipSVG.append("g")
                    .attr("class", "axis")
                    .attr("transform", `translate(0,${0.5 * height - 0.5 * (chartMargin.bottom)})`)
                    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
                    .selectAll("text")
                    .style("text-anchor", "end")
                    .attr("dx", "-.4em")
                    .attr("dy", ".15em");

                // Add the Y Axis
                tipSVG.append("g")
                    .attr("class", "axis")
                    .attr('transform', `translate(${0.5 * chartMargin.left}, 0)`)
                    .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

            })
            .on('mouseout', function (d) {
                //g.selectAll('.interactiveMap').attr('opacity', 1);
                tool_tip.hide();
            })
            .attr("d", path)
            .append('title')
            .text(d => d.properties.name);

        svgGroup.append('g')
            .attr('class', 'map geography')
            .attr('id', 'borders')
            .append("path")
            .datum(topojson.mesh(interactiveMapData, interactiveMapData.objects.countries, (a, b) => a !== b))
            .attr("fill", "none")
            .attr("stroke", "white")
            .style('stroke-width', 1.5)
            .attr("stroke-linejoin", "round")
            .attr("d", path);

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