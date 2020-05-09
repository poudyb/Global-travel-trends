/**
 * scrollVis - encapsulates
 * all the code for the visualization
 * using reusable charts pattern:
 * http://bost.ocks.org/mike/chart/
 */
var scrollVis = function () {
    // constants to define the size
    // and margins of the vis area.
    var width = 970;
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

    // // Sizing for the grid visualization
    // var squareSize = 6;
    // var squarePad = 2;
    // var numPerRow = width / (squareSize + squarePad);

    // main svg used for visualization
    var svg = null;

    // d3 selection that will be used
    // for displaying visualizations
    var g = null;

    var projection = null;


    var xAreaScale = d3.scaleLinear()
        .domain([1995, 2018])
        .range([chartMargin.left, width - chartMargin.right]);

    var yAreaScale = d3.scaleLinear()
        .domain([0, 8e8])
        .range([height - chartMargin.bottom, chartMargin.top]);

    // We will set the domain when the
    // data is processed.
    // @v4 using new scale names
    var xBarScale = d3.scaleLinear()
        .range([0, width]);

    // The bar chart display is horizontal
    // so we can use an ordinal scale
    // to get width and y locations.
    // @v4 using new scale type
    var yBarScale = d3.scaleBand()
        .paddingInner(0.08)
        .domain([0, 1, 2])
        .range([0, height - 50], 0.1, 0.1);

    // Color is determined just by the index of the bars
    var barColors = {0: '#008080', 1: '#399785', 2: '#5AAF8C'};

    // The histogram display shows the
    // first 30 minutes of data
    // so the range goes from 0 to 30
    // @v4 using new scale name
    var xHistScale = d3.scaleLinear()
        .domain([0, 30])
        .range([0, width - 20]);

    // @v4 using new scale name
    var yHistScale = d3.scaleLinear()
        .range([height, 0]);

    // The color translation uses this
    // scale to convert the progress
    // through the section into a
    // color value.
    // @v4 using new scale name
    var coughColorScale = d3.scaleLinear()
        .domain([0, 1.0])
        .range(['#008080', 'red']);

    // You could probably get fancy and
    // use just one axis, modifying the
    // scale, but I will use two separate
    // ones to keep things easy.
    // @v4 using new axis name
    var xAxisBar = d3.axisBottom()
        .scale(xBarScale);

    // @v4 using new axis name
    var xAxisHist = d3.axisBottom()
        .scale(xHistScale)
        .tickFormat(function (d) {
            return d + ' min';
        });

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
    var southKorea = null
    var usa = null;
    var interactiveMapData = null;
    var inboundTourism =null;
    /**
     * chart
     *
     * @param selection - the current d3 selection(s)
     *  to draw the visualization in. For this
     *  example, we will be drawing it in #vis
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

            console.log("tourism", tourism)

            southKorea = rawData[1].filter(d => d.country_code === "KOR");

            usa = rawData[1].filter(d => d.country_code === "USA");
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
            g = svg.select('g')
                // .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
                .attr('transform', 'translate(50,30)');

            // // perform some preprocessing on raw data
            // var wordData = getWords(rawData);
            // // filter to just include filler words
            // var fillerWords = getFillerWords(wordData);
            //
            // // get the counts of filler words for the
            // // bar chart display
            // var fillerCounts = groupByWord(fillerWords);
            // // set the bar scale's domain
            // var countMax = d3.max(fillerCounts, function (d) {
            //     return d.value;
            // });
            // xBarScale.domain([0, countMax]);
            //
            // // get aggregated histogram data
            //
            // var histData = getHistogram(fillerWords);
            // // set histogram's domain
            // var histMax = d3.max(histData, function (d) {
            //     return d.length;
            // });
            // yHistScale.domain([0, histMax]);

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
        projection = d3.geoNaturalEarth1().scale(200);
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
            .attr('r', d => radius(parseFloat(tourism.get("1995").get(d.id))));


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

        // area = g.selectAll('.area-chart');
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
            .attr('class', 'south-korea')

        g.append('g')
            .attr('class', 'usa')

        g.append('g')
            .attr('class', 'interactiveMap')

        //
        //     // axis
        //     g.append('g')
        //         .attr('class', 'x axis')
        //         .attr('transform', 'translate(0,' + height + ')')
        //         .call(xAxisBar);
        //     g.select('.x.axis').style('opacity', 0);
        //
        //     // count openvis title
        //     g.append('text')
        //         .attr('class', 'title openvis-title')
        //         .attr('x', width / 2)
        //         .attr('y', height / 3)
        //         .text('2013');
        //
        //     g.append('text')
        //         .attr('class', 'sub-title openvis-title')
        //         .attr('x', width / 2)
        //         .attr('y', (height / 3) + (height / 5))
        //         .text('OpenVis Conf');
        //
        //     g.selectAll('.openvis-title')
        //         .attr('opacity', 0);
        //
        //     // count filler word count title
        //     g.append('text')
        //         .attr('class', 'title count-title highlight')
        //         .attr('x', width / 2)
        //         .attr('y', height / 3)
        //         .text('180');
        //
        //     g.append('text')
        //         .attr('class', 'sub-title count-title')
        //         .attr('x', width / 2)
        //         .attr('y', (height / 3) + (height / 5))
        //         .text('Filler Words');
        //
        //     g.selectAll('.count-title')
        //         .attr('opacity', 0);
        //
        //     // square grid
        //     // @v4 Using .merge here to ensure
        //     // new and old data have same attrs applied
        //     var squares = g.selectAll('.square').data(wordData, function (d) {
        //         return d.word;
        //     });
        //     var squaresE = squares.enter()
        //         .append('rect')
        //         .classed('square', true);
        //     squares = squares.merge(squaresE)
        //         .attr('width', squareSize)
        //         .attr('height', squareSize)
        //         .attr('fill', '#fff')
        //         .classed('fill-square', function (d) {
        //             return d.filler;
        //         })
        //         .attr('x', function (d) {
        //             return d.x;
        //         })
        //         .attr('y', function (d) {
        //             return d.y;
        //         })
        //         .attr('opacity', 0);
        //
        //     // barchart
        //     // @v4 Using .merge here to ensure
        //     // new and old data have same attrs applied
        //     var bars = g.selectAll('.bar').data(fillerCounts);
        //     var barsE = bars.enter()
        //         .append('rect')
        //         .attr('class', 'bar');
        //     bars = bars.merge(barsE)
        //         .attr('x', 0)
        //         .attr('y', function (d, i) {
        //             return yBarScale(i);
        //         })
        //         .attr('fill', function (d, i) {
        //             return barColors[i];
        //         })
        //         .attr('width', 0)
        //         .attr('height', yBarScale.bandwidth());
        //
        //     var barText = g.selectAll('.bar-text').data(fillerCounts);
        //     barText.enter()
        //         .append('text')
        //         .attr('class', 'bar-text')
        //         .text(function (d) {
        //             return d.key + '…';
        //         })
        //         .attr('x', 0)
        //         .attr('dx', 15)
        //         .attr('y', function (d, i) {
        //             return yBarScale(i);
        //         })
        //         .attr('dy', yBarScale.bandwidth() / 1.2)
        //         .style('font-size', '110px')
        //         .attr('fill', 'white')
        //         .attr('opacity', 0);
        //
        //     // histogram
        //     // @v4 Using .merge here to ensure
        //     // new and old data have same attrs applied
        //     var hist = g.selectAll('.hist').data(histData);
        //     var histE = hist.enter().append('rect')
        //         .attr('class', 'hist');
        //     hist = hist.merge(histE).attr('x', function (d) {
        //         return xHistScale(d.x0);
        //     })
        //         .attr('y', height)
        //         .attr('height', 0)
        //         .attr('width', xHistScale(histData[0].x1) - xHistScale(histData[0].x0) - 1)
        //         .attr('fill', barColors[0])
        //         .attr('opacity', 0);
        //
        //     // cough title
        //     g.append('text')
        //         .attr('class', 'sub-title cough cough-title')
        //         .attr('x', width / 2)
        //         .attr('y', 60)
        //         .text('cough')
        //         .attr('opacity', 0);
        //
        //     // arrowhead from
        //     // http://logogin.blogspot.com/2013/02/d3js-arrowhead-markers.html
        //     svg.append('defs').append('marker')
        //         .attr('id', 'arrowhead')
        //         .attr('refY', 2)
        //         .attr('markerWidth', 6)
        //         .attr('markerHeight', 4)
        //         .attr('orient', 'auto')
        //         .append('path')
        //         .attr('d', 'M 0,0 V 4 L6,2 Z');
        //
        //     g.append('path')
        //         .attr('class', 'cough cough-arrow')
        //         .attr('marker-end', 'url(#arrowhead)')
        //         .attr('d', function () {
        //             var line = 'M ' + ((width / 2) - 10) + ' ' + 80;
        //             line += ' l 0 ' + 230;
        //             return line;
        //         })
        //         .attr('opacity', 0);
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
            usaStory,
            showInteractiveMap,
            showHistAll,
            showCough,
            showHistAll
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
     * showMap - initial title
     *
     * hides: count title
     * (no previous step to hide)
     * shows: intro title
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

        g.selectAll('.count-title')
            .transition()
            .duration(0)
            .attr('opacity', 0);

        g.selectAll('.openvis-title')
            .transition()
            .duration(600)
            .attr('opacity', 1.0);
    }

    /**
     * showInitialTourism - filler counts
     *
     * hides: intro title
     * hides: square grid
     * shows: filler count title
     *
     */
    function showInitialTourism() {
        // svg.attr('width', width / 2)
        //     .attr('height', height / 2);
        g.selectAll('.circles')
            .transition()
            .duration(800)
            .attr('opacity', 1);

        // g.selectAll('.map')
        //     .transition()
        //     .duration(1600)
        //     .selectAll('path')
        //     .attr("fill", "#cccccc")
        //     .attrTween("d", d3.geoPath(projection.rotate([100, 0])));
        //

        g.selectAll('.openvis-title')
            .transition()
            .duration(0)
            .attr('opacity', 0);

        g.selectAll('.square')
            .transition()
            .duration(0)
            .attr('opacity', 0);

        g.selectAll('.count-title')
            .transition()
            .duration(600)
            .attr('opacity', 1.0);
    }

    /**
     * animateTourism - square grid
     *
     * hides: filler count title
     * hides: filler highlight in grid
     * shows: square grid
     *
     */
    function animateTourism() {
        var year = 1995;
        var timer = setInterval(() => {
            year += 1;
            if (year === 2018) {
                clearInterval(timer)
            }
            var yearData = tourism.get(year.toString());

            g.selectAll('.circles')
                .selectAll('circle')
                .transition()
                .duration(200)
                .ease(d3.easeLinear)
                .attr('r', d => radius(yearData.get(d.id)));
        }, 200);
        // d3.select('#clock').html(attributeArray[currentAttribute]);  // update the clock

        g.selectAll('.area-chart')
            .transition()
            .duration(300)
            .attr('opacity', 0);

        g.selectAll('.count-title')
            .transition()
            .duration(0)
            .attr('opacity', 0);

        g.selectAll('.square')
            .transition()
            .duration(600)
            .delay(function (d) {
                return 5 * d.row;
            })
            .attr('opacity', 1.0)
            .attr('fill', '#ddd');
    }

    /**
     * showAreaChart - show fillers in grid
     *
     * hides: barchart, text and axis
     * shows: square grid and highlighted
     *  filler words. also ensures squares
     *  are moved back to their place in the grid
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

        // hideAxis();
        // g.selectAll('.bar')
        //     .transition()
        //     .duration(600)
        //     .attr('width', 0);
        //
        // g.selectAll('.bar-text')
        //     .transition()
        //     .duration(0)
        //     .attr('opacity', 0);
        //
        //
        // g.selectAll('.square')
        //     .transition()
        //     .duration(0)
        //     .attr('opacity', 1.0)
        //     .attr('fill', '#ddd');
        //
        // // use named transition to ensure
        // // move happens even if other
        // // transitions are interrupted.
        // g.selectAll('.fill-square')
        //     .transition('move-fills')
        //     .duration(800)
        //     .attr('x', function (d) {
        //         return d.x;
        //     })
        //     .attr('y', function (d) {
        //         return d.y;
        //     });
        //
        // g.selectAll('.fill-square')
        //     .transition()
        //     .duration(800)
        //     .attr('opacity', 1.0)
        //     .attr('fill', function (d) {
        //         return d.filler ? '#008080' : '#ddd';
        //     });
    }

    /**
     * zoomInAreaChart - barchart
     *
     * hides: square grid
     * hides: histogram
     * shows: barchart
     *
     */
    function zoomInAreaChart() {
        // ensure bar axis is set
        showAxis(xAxisBar);

        var newArea = d3.area()
            .x(d => xAreaScale(parseInt(d.data.year)))
            // .y0((d, i, n) => yAreaScale((n.key === 'Korea, Rep.') ? d[0] - d[0] : 0))
            .y0(yAreaScale(0))
            .y1((d, i, n) => yAreaScale((n.key === 'Korea, Rep.') ? d[1] - d[0] : 0));

        g.select('.area-yaxis')
            .transition()
            .duration(1200)
            .attr('transform', `translate(${chartMargin.left}, 0)`)
            .call(d3.axisLeft(yAreaScale.domain([0, 2e7])).tickFormat(d3.format(".2s")));

        g.selectAll('.area-lines')
            .selectAll('path')
            .transition()
            .duration(1200)
            .attr('fill', '#b30000')
            .attr('d', newArea);


        //
        // g.selectAll('.square')
        //     .transition()
        //     .duration(800)
        //     .attr('opacity', 0);
        //
        // g.selectAll('.fill-square')
        //     .transition()
        //     .duration(800)
        //     .attr('x', 0)
        //     .attr('y', function (d, i) {
        //         return yBarScale(i % 3) + yBarScale.bandwidth() / 2;
        //     })
        //     .transition()
        //     .duration(0)
        //     .attr('opacity', 0);
        //
        // g.selectAll('.hist')
        //     .transition()
        //     .duration(600)
        //     .attr('height', function () {
        //         return 0;
        //     })
        //     .attr('y', function () {
        //         return height;
        //     })
        //     .style('opacity', 0);
        //
        // g.selectAll('.bar')
        //     .transition()
        //     .delay(function (d, i) {
        //         return 300 * (i + 1);
        //     })
        //     .duration(600)
        //     .attr('width', function (d) {
        //         return xBarScale(d.value);
        //     });
        //
        // g.selectAll('.bar-text')
        //     .transition()
        //     .duration(600)
        //     .delay(1200)
        //     .attr('opacity', 1);
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
            .style('text-align', 'center')

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
        southKorea.forEach(d => {
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
        x.domain(d3.extent(southKorea, d => d.year));
        max_visitors = d3.max(southKorea, d => d.inbound);
        y.domain([0, 2e7]); // round up to nearest million for a clean y-axis


        // Add the line
        svgGroup.append("path")
            .data([southKorea])
            .style('stroke', "blue")
            .style("fill", "none")
            .attr("d", line);

        // Appends a circle for each datapoint
        svgGroup.selectAll(".dot")
            .data(southKorea)
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


        // // switch the axis to histogram one
        // showAxis(xAxisHist);
        //
        // g.selectAll('.bar-text')
        //     .transition()
        //     .duration(0)
        //     .attr('opacity', 0);
        //
        // g.selectAll('.bar')
        //     .transition()
        //     .duration(600)
        //     .attr('width', 0);
        //
        // // here we only show a bar if
        // // it is before the 15 minute mark
        // g.selectAll('.hist')
        //     .transition()
        //     .duration(600)
        //     .attr('y', function (d) {
        //         return (d.x0 < 15) ? yHistScale(d.length) : height;
        //     })
        //     .attr('height', function (d) {
        //         return (d.x0 < 15) ? height - yHistScale(d.length) : 0;
        //     })
        //     .style('opacity', function (d) {
        //         return (d.x0 < 15) ? 1.0 : 1e-6;
        //     });
    }

    /**
     * usaStory - presents the inbound travel patterns
     * in the past 25 years
     *
     */
    function usaStory() {
        g.selectAll('.area-chart,.map,.south-korea,rect')
            .transition()
            .duration(600)
            .attr('opacity', 0);

        var svgGroup = g.selectAll('.usa');

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

        specialYrs = ['1997','2001','2003','2008','2009'];
        specialInfo = {
            '1997':"1997: Congress stopped funding for U.S. Travel and Tourism Advisory Board (USTTAB) that promoted US Tourism",
            '2001':"2001: 9/11 Incident", 
            '2003':"2003: Congress re-established the U.S. Travel and Tourism Advisory Board (USTTAB)",
            '2008':"2008: Financial Crisis",
            '2009':"2009: Lawmakers established a public-private entity to promote U.S. tourism, the Corporation for Trade Promotion, which does business as Brand USA"
        };

        var dataToDisplayOnMouseOver = {};
        usa.forEach(d => {
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
        x.domain(d3.extent(usa, d => d.year));
        max_visitors = d3.max(usa, d => d.inbound);
        y.domain([0, Math.ceil(max_visitors/1000000)*1000000]); // round up to nearest million for a clean y-axis


        // Add the line
        svgGroup.append("path")
            .data([usa])
            .style('stroke', "blue")
            .style("fill", "none")
            .attr("d", line);

        // Appends a circle for each datapoint
        svgGroup.selectAll(".dot")
            .data(usa)
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
        var curtain = svgGroup.append('rect')
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

    function showInteractiveMap(){
        g.selectAll('.area-chart,.map,.south-korea,.usa, rect')
            .transition()
            .duration(600)
            .attr('opacity', 0);
                  
        var svgGroup = g.selectAll('.interactiveMap');

        countriesWithData = []

        inboundTourism.forEach(function (d){
            if(countriesWithData.indexOf(d.country_name) == -1) {
                countriesWithData.push(d.country_name)
			}
		})
        /*countriesWithData = ["Austria","Canada","China","Croatia","France","Germany","Greece","Hong Kong","Hungary","India","Italy","Macao","Malaysia","Mexico","Netherlands","Poland", "Portugal",
                         "Russian Federation","Saudi Arabia","Spain","Thailand","Turkey","Ukraine","United Arab Emirates","United Kingdom","United States Of America"]*/

        console.log(countriesWithData)
        projection = d3.geoNaturalEarth1().scale(200);

        var path = d3.geoPath(projection);
    
        var path = d3.geoPath(projection);
   
        var countries = topojson.feature(interactiveMapData, interactiveMapData.objects.countries).features;

        // define the tooltip 
        var tool_tip = d3.tip()
        .attr("class", "d3-tip")
         // input the title, and include the div
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
                if(countriesWithData.indexOf(d.properties.name) >= 0){
                    return "rgb(33,113,181)";
                }
                else {
                    return "gray";
                }
            })
            .on("mouseover", function (d) {
                // get the name of the country
                g.selectAll('.interactiveMap')
                .attr('opacity', 0.3);
                current_country = d.properties.name
	            // show the tooltip
                tool_tip.show();
                
                var tipSVG = d3.select("#tipDiv")
                .append("svg")
                .attr("width", 0.5*width)
                .attr("height", 0.5*height);

                var parseDate = d3.timeParse("%Y");
                   
                var selectedCountryInbound = inboundTourism.filter(function(d) {
                    return d.country_name === current_country;
                });
                
                selectedCountryInbound.forEach(function(d) {
                   d.year = d.year;
                   d.inbound = +d.inbound || 0
                   console.log("the value is", d.inbound)
                   d.inbound = parseInt(d.inbound);
                });

                var x = d3.scaleTime().range([0.5* chartMargin.left, 0.5*(width - chartMargin.right)]);
                var y = d3.scaleLinear().range([0.5*(height - chartMargin.bottom), 0.5* chartMargin.top]);

                var line = d3.line()
                    .x(d => x(d.year))
                    .y(d => y(d.inbound))
                    .curve(d3.curveNatural);

                // Scale the range of the data
                x.domain(d3.extent(selectedCountryInbound, d => d.year));
                max_visitors = d3.max(selectedCountryInbound, d => d.inbound);
                y.domain([0, Math.ceil(max_visitors/1000000)*1000000]); // round up to nearest million for a clean y-axis

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
                    .attr("r", 2.5) // make dots for 'special years' larger (will re-color next) to direct the readers' attention
                    .style("fill",  "blue")
            
                // Add the X Axis
                tipSVG.append("g")
                    .attr("class", "axis")
                    .attr("transform", `translate(0,${0.5*height - 0.5*(chartMargin.bottom)})`)
                    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
                    .selectAll("text")
                    .style("text-anchor", "end")
                    .attr("dx", "-.4em")
                    .attr("dy", ".15em");

                // Add the Y Axis
                tipSVG.append("g")
                    .attr("class", "axis")
                    .attr('transform', `translate(${0.5*chartMargin.left}, 0)`)
                    .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

            })
            .on('mouseout', tool_tip.hide)
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
     * showHistAll - show all histogram
     *
     * hides: cough title and color
     * (previous step is also part of the
     *  histogram, so we don't have to hide
     *  that)
     * shows: all histogram bars
     *
     */
    function showHistAll() {
        // ensure the axis to histogram one
        showAxis(xAxisHist);

        g.selectAll('.cough')
            .transition()
            .duration(0)
            .attr('opacity', 0);

        // named transition to ensure
        // color change is not clobbered
        g.selectAll('.hist')
            .transition('color')
            .duration(500)
            .style('fill', '#008080');

        g.selectAll('.hist')
            .transition()
            .duration(1200)
            .attr('y', function (d) {
                return yHistScale(d.length);
            })
            .attr('height', function (d) {
                return height - yHistScale(d.length);
            })
            .style('opacity', 1.0);
    }

    /**
     * showCough
     *
     * hides: nothing
     * (previous and next sections are histograms
     *  so we don't have to hide much here)
     * shows: histogram
     *
     */
    function showCough() {
        // ensure the axis to histogram one
        showAxis(xAxisHist);

        g.selectAll('.hist')
            .transition()
            .duration(600)
            .attr('y', function (d) {
                return yHistScale(d.length);
            })
            .attr('height', function (d) {
                return height - yHistScale(d.length);
            })
            .style('opacity', 1.0);
    }

    /**
     * showAxis - helper function to
     * display particular xAxis
     *
     * @param axis - the axis to show
     *  (xAxisHist or xAxisBar)
     */
    function showAxis(axis) {
        g.select('.x.axis')
            .call(axis)
            .transition().duration(500)
            .style('opacity', 1);
    }

    /**
     * hideAxis - helper function
     * to hide the axis
     *
     */
    function hideAxis() {
        g.select('.x.axis')
            .transition().duration(500)
            .style('opacity', 0);
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
     * DATA FUNCTIONS
     *
     * Used to coerce the data into the
     * formats we need to visualize
     *
     */

    /**
     * getWords - maps raw data to
     * array of data objects. There is
     * one data object for each word in the speach
     * data.
     *
     * This function converts some attributes into
     * numbers and adds attributes used in the visualization
     *
     * @param rawData - data read in from file
     */
    function getWords(rawData) {
        return rawData.map(function (d, i) {
            // is this word a filler word?
            d.filler = (d.filler === '1') ? true : false;
            // time in seconds word was spoken
            d.time = +d.time;
            // time in minutes word was spoken
            d.min = Math.floor(d.time / 60);

            // positioning for square visual
            // stored here to make it easier
            // to keep track of.
            d.col = i % numPerRow;
            d.x = d.col * (squareSize + squarePad);
            d.row = Math.floor(i / numPerRow);
            d.y = d.row * (squareSize + squarePad);
            return d;
        });
    }

    /**
     * getFillerWords - returns array of
     * only filler words
     *
     * @param data - word data from getWords
     */
    function getFillerWords(data) {
        return data.filter(function (d) {
            return d.filler;
        });
    }

    /**
     * getHistogram - use d3's histogram layout
     * to generate histogram bins for our word data
     *
     * @param data - word data. we use filler words
     *  from getFillerWords
     */
    function getHistogram(data) {
        // only get words from the first 30 minutes
        var thirtyMins = data.filter(function (d) {
            return d.min < 30;
        });
        // bin data into 2 minutes chuncks
        // from 0 - 31 minutes
        // @v4 The d3.histogram() produces a significantly different
        // data structure then the old d3.layout.histogram().
        // Take a look at this block:
        // https://bl.ocks.org/mbostock/3048450
        // to inform how you use it. Its different!
        return d3.histogram()
            .thresholds(xHistScale.ticks(10))
            .value(function (d) {
                return d.min;
            })(thirtyMins);
    }

    /**
     * groupByWord - group words together
     * using nest. Used to get counts for
     * barcharts.
     *
     * @param words
     */
    function groupByWord(words) {
        return d3.nest()
            .key(function (d) {
                return d.word;
            })
            .rollup(function (v) {
                return v.length;
            })
            .entries(words)
            .sort(function (a, b) {
                return b.value - a.value;
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