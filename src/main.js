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

    var circleColor = d3.scaleSequential()
        .domain([0, 1e8])
        .interpolator(d3.interpolateBlues);

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
        var tooltip = d3.select("#vis")
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
            .attr('fill', '#2c7fb8')
            .attr('opacity', 0.8)
            .attr('d', area)
            .on('mouseover', function(d) {
                if (activeIndex === 3) {
                    var yVal = (d[d.length - 1][0] + d[d.length - 1][1]) / 2;
                    var yPos = yAreaScale(yVal);
                    d3.select(this)
                        .transition()
                        .duration(0)
                        .attr('fill', '#cccccc')
                        .attr('stroke', '#444');

                    tooltip
                        .transition()
                        .duration(10)
                        .text(d.key)
                        .style("visibility", "visible")
                        .style("left", `${width - 50}px`)
                        .style("top", yPos + "px")
                }
            })
            .on('mouseout', function() {
                if (activeIndex === 3) {
                    d3.select(this)
                        .transition()
                        .duration(0)
                        .attr('fill', '#2c7fb8')
                        .attr('stroke', null);
                }
            });

        g.selectAll('.area-lines')
            .on('mouseout', function() {
                tooltip.style("visibility", "hidden")
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
            .attr('class', 'south-korea');

        g.append('g')
            .attr('class', 'usaData');

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
        activateFunctions = [
            showMap,
            showInitialTourism,
            animateTourism,
            showAreaChart,
            zoomInAreaChart,
            southKoreaStory,
            usaStory,
            showInteractiveMap
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
            .transition("area")
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
        // g.selectAll('.area-chart,.map')
        //     .transition()
        //     .duration(600)
        //     .attr('opacity', 0);

        var svgGroup = g.selectAll('.south-korea');
        //console.log(d3.select("#usefulSelector").node().getBBox());
        //var koreaPos = southKorea.getBoundingClientRect();
        //var Pos2 = d3.select('.south-korea').node().getBBox();
        //var chartPos = document.querySelector('.area-chart').getBoundingClientRect();
        //console.log(this.getBoundingClientRect());

        var textWidth = width * 0.3;
        var newChartWidth = width * 0.7;
//        console.log('text',textWidth,'chart',newChartWidth);

        const tooltipDuration = 100;
        var tooltip = d3.select("body")
            .append("div")
            .attr('width', textWidth + "px")
            .style("position", "absolute")
            .style("z-index", "15")
            .style("visibility", "hidden")
            /*
            .style("background", "#eeeeee")
            .style('padding', '20px')
            .style('border', '2px solid grey')
            .style('border-radius', '5px')
            */
            .style('font-size', '0.8em')
            .style('text-align', 'center');

        /*
                var storyText = d3.select("body")
                    .append("div")
                    .style("position", "absolute")
                    //.attr("x", width - textWidth)
                    //.attr("y", chartMargin.top)
                    .attr('width',textWidth + "px")
                    .style("z-index", "15")
                    .style("visibility", "hidden")
                    //.style("background", "#eeeeee")
                    .style('padding', '20px')
                    //.style('border', '2px solid grey')
                    //.style('border-radius', '5px')
                    .style('font-size', '0.8em')
                    .style('text-align', 'center');
        */
        /*
                    var textBox = svg.append('rect')
                    .attr('x', width - textWidth)
                    .attr('y', chartMargin.top)
                    .attr('height', height + 5)
                    .attr('width', textWidth + "px")
                    .attr('class', 'curtain')
                    .attr('transform', 'rotate(180)')
                    .style('fill', '#ffffff');
        */

        const specialYrs = ['1997', '1998', '2003', '2015', '2017', '2018'];
        const specialInfo = {
            '1997': "1997: Financial crisis",
            '1998': '1998: Cultural investments',
            '2003': "2003: Heightened tensions",
            '2015': "2015: MERS outbreak",
            '2017': "2017: Chinese restrictions",
            '2018': "2018: PyeongChang Olympics"
        };

        const specialDetails = {
            '1997': "The beginning of Korea’s rise in the entertainment industry was born in an unusual context: a financial crisis. In 1997, a major financial crisis hit Southeast and East Asia when a change in Thai fiscal policy revealed a number of asset bubbles across the region and led to massive currency devaluations, reduced imports, and political upheaval. South Korea borrowed $55 billion from the IMF, World Bank, and Asian Development Bank, a debt they were determined to re-pay as quickly as possible. Incredibly, they managed to re-pay the debt in <5 years, nearly 3 years ahead of schedule. A major part of this effort was a voluntary, national gold-collecting campaign which asked for donations from citizens to help pay back the debt. Amazingly, nearly 3.5 million Koreans (almost 25% of the population) stood in line to contribute their gold, netting $2.2 billion dollars to help reduce the debt.",
            '1998': "Korea’s economy remained weak, and the government was eager to re-define Korea’s place in the world and find new growth engines. One area in which they took a major bet was entertainment, establishing the Ministry of Culture and Tourism to invest in creative content, inject funding into the Korean Film Council, and fund the creation of 300 cultural industry departments in colleges and universities to churn out talent. Since then, the Ministry of Culture and Tourism’s budget has only grown, breaking $1 billion in 2005, reaching over $5 billion (1.4% of government spending) in 2014, and remaining 2%+ of the national budget up to today. This investment in “soft power” and cultural exports began to pay off as Korean television shows, K-pop groups, and films began to take off internationally, first in China, Japan, and other parts of Asia in the early-to-mid 2000s, and later in the U.S. and elsewhere in the late 2000s. The Korean Tourism Organization capitalized on this growth, launching tourism campaigns focused on popular shows and K-pop groups. Private entertainment agencies got involved as well, offering travel packages for tourists interested in attending concerts by their artists in 2012. The international explosion of “Gangnam Style” in 2012-13 provided another boost to the industry. With the exception of 2003, consistent and accelerating growth in tourism throughout this period demonstrated very positive ROI on this decade+ of cultural investments.",
            '2003': "In 2003, tensions between North and South Korea rose considerably (including North Korea’s withdrawal from the Nuclear Non-Proliferation Treaty), likely affecting tourist traffic to the Korean peninsula.",
            '2015': "2015 saw a reversal of these earlier growth trends, as Korea’s growth in popularity as a hot tourist destination was countered by an outbreak of Middle East Respiratory Syndrome (MERS) in the country. The epidemic hit Korea in May, 2015 and lasted through the end of the year, resulting in the quarantine of more than 16,000 people, cancellations of major events, and widespread concern about the safety of travel within Korea. MERS was not highly-infectious – only 186 hospitalizations occurred as a result of the outbreak, with 38 deaths – but it was sufficient to cause many tourists to cancel their planned trips. Korea attempted to stem the losses in tourist activity through actions like introducing free “MERS insurance” for all tourists, which would cover both healthcare and travel expenses for anyone who caught MERS during their visit. It is possible that without these measures, the numbers would have been even lower; however, even with them, it is estimated that the outbreak cost Korea >2 million international tourist visits and $2.6 billion in tourism industry revenues. This is a scary reality for countries all over the world experiencing and fearing the total impact of a much more infectious, severe, and widespread pandemic like coronavirus. However, it is potentially very encouraging that Korea’s tourism industry re-bounded after the end of the outbreak, appearing to resume its previous trajectory with an all-time high of 17.2M tourists in 2016.",
            '2017': "2017 brought its own challenges for Korea’s tourism industry, as geopolitical tensions rose between South and North Korea and allies the United States and China, respectively. Specifically, the installation of a U.S. missile defense system in South Korea spurred a strong reaction from the Chinese government, who quickly imposed a ban on all group travel from China to South Korea for the entirety of the year, only partially lifting it (allowing in-person sales only but retaining the ban on online sales) by the end of 2017. Given that Chinese tourists made up 46.8% of all international tourists to Korea in the previous year, this ban had a devastating impact on Korea’s tourism industry, dropping it to the levels of the MERS outbreak without any similar type of health, social, or economic driver within Korea itself. ",
            '2018': "This ban on online sales of group travel to Korea from China likely continued to depress tourism for the first part of 2018, but a thawing of relations between the two governments and the Korea’s hosting of the Winter Olympics in PyeongChang enabled Korea to recover to above pre-MERS levels, with strong 15% year-over-year growth from 2017 to 2018."
        };

        var dataToDisplayOnMouseOver = {};
        var dataToDisplayOnClick = {};
        southKoreaData.forEach(d => {
            if (specialYrs.indexOf(d.year) >= 0) {
                dataToDisplayOnMouseOver[d.year] = specialInfo[d.year];
                dataToDisplayOnClick[d.year] = specialDetails[d.year];
            } else {
                dataToDisplayOnMouseOver[d.year] = d.year;
                dataToDisplayOnClick[d.year] = '';
            }
        });

        var x = d3.scaleTime().range([chartMargin.left, (newChartWidth - chartMargin.right)]);
        var y = d3.scaleLinear().range([(height - chartMargin.bottom), chartMargin.top]);

        var line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.inbound))
            .curve(d3.curveNatural);

        // Scale the range of the data
        x.domain(d3.extent(southKoreaData, d => d.year));
        max_visitors = d3.max(southKoreaData, d => d.inbound);
        y.domain([0, 2e7]); // round up to nearest million for a clean y-axis

        // Add variable to determine if data point clicked or not (so tooltip stays until second click)
        var clickFlag = false;

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
                if (!clickFlag) {
                    dataToDisplay = dataToDisplayOnMouseOver[d.year];
                    tooltip.html("<b><u>" + dataToDisplay + "</b></u>"
                        + "<br />" + 'International Visitors: ' + parseInt(d.inbound).toLocaleString()); // show the year, any special information, & the # int'l visitors
                    //clickFlag = false;
                    return tooltip.transition().duration(tooltipDuration)
                        .style("visibility", "visible")
                        .style("top", (d3.event.pageY - 15) + "px")
                        .style("left", (d3.event.pageX + 10) + "px")
                        .style("background", "#eeeeee")
                        .style('padding', '10px')
                        .style('border', '2px solid grey')
                        .style('border-radius', '3px')
                        .style('width', '200px')
                }
            })


            .on("mouseout", function () {
                if (!clickFlag) {
                    return tooltip.style("visibility", "hidden");
                }
            })

            .on('click', d => {
                selectedYr = d.year;
                dataToDisplay = dataToDisplayOnClick[d.year];

                //console.log('event y is', d3.event.pageY);
                //console.log('height is', height);
                //console.log('x axis attempt', x(intersection.x));
                //console.log(xScale.invert())

                if (clickFlag) {
                    clickFlag = !clickFlag;
                    return tooltip.style("visibility", "hidden")
                } else {
                    if (dataToDisplay.length > 0) {
                        tooltip.html("<b><u>" + "Korea's Tourism Story: " + selectedYr + "</b></u>"
                            + "<br />" + dataToDisplay); // show the long text for that year
                        clickFlag = !clickFlag;
                        return tooltip.transition().duration(0)
                            .style("visibility", "visible")
                            //.attr('transform', `translate(970, ${chartMargin.top})`)
                            //.style("top", 0 + "px")
                            //.style("left", (d3.event.pageX + 10) + "px")
                            //.style("left", (width + chartMargin*2))
                            .style("left", (400 + newChartWidth) + "px")
                            //.style("right", textWidth)
                            //.attr("transform", `translate(0,${chartMargin.top})`)
                            //.style("top", (chartMargin.top) + "px")
                            .style('top', "3990px")
                            //.style("top", ((d3.event.pageY - height/2) + "px")
                            .style('width', (chartMargin.right * 1.9 + textWidth) + "px")
                            .style("background", "#ffffff")
                            .style('padding', '10px')
                            .style('border', '0px solid grey')
                            .style('border-radius', '0px')
                        /*                             function (d) {
                                                        console.log(d3.event.pageX);
                                                        console.log('right margin',chartMargin.right);
                                                        console.log('left margin',chartMargin.left)
                                                        console.log('width & height',width,height);
                                                        if (parseInt(selectedYr) <= 2003) {
                                                            posFromLeft = d3.event.pageX + 10;
                                                        } else {
                                                            posFromLeft = d3.event.pageX - width;
                                                        }
                                                        return posFromLeft + "px";
                                                         })
                                                    .style("right", function (d) { return (posFromLeft - 400) + "px" });
                                                        }
                                                }
                          */
                        //return clickFlag = !clickFlag
                    }
                }
            });

//                $('#example').popover('show');
//                window.alert(dataToDisplay)
        /*
                        tooltip.html(dataToDisplay); // show the long text for that year
                        return clickFlag != clickFlag
        //                return tooltip.transition().duration(tooltipDuration)
                            .style("visibility", "visible")
                            .style("top", (d3.event.pageY - dataToDisplay.length/10) + "px")
                            .style("top", (d3.event.pageY + 10) + "px")
        /*                    .style("left", function (d) {
                                if (parseInt(selectedYr) <= 2003) {
                                    return d3.event.pageX + 10 + "px";
                                } else {
                                    return d3.event.pageX - 300 + "px";
                                }
                                }
                            )
        */
//                    .style("left", (d3.event.pageX + dataToDisplay.length/100) + "px");

//            ;

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

        // Add a chart title (not working)
        /*        svgGroup.append("text")
                    .attr("transform", `translate(0,10)`)
                    .selectAll("text")
                    .attr("x", (width / 2))
                    .attr("y", 0 - (margin.top / 2))
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .style("text-decoration", "underline")
                    .text("International Tourism to S. Korea, 1995-2018");
        */

        /* Add 'curtain' rectangle to hide entire graph */
        var curtain = svg.append('rect')
            .attr('x', -1 * newChartWidth)
            .attr('y', -1 * height)
            .attr('height', height + 5)
            .attr('width', newChartWidth - 5)
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
        g.selectAll('.area-chart,.map,.south-korea,rect')
            .transition()
            .duration(600)
            .attr('opacity', 0);

        var svgGroup = g.selectAll('.usaData');

        var textWidth = width * 0.3;
        var newChartWidth = width * 0.7;

        const tooltipDuration = 100;
        var tooltip = d3.select("body")
            .append("div")
            .attr('width', textWidth + "px")
            .style("position", "absolute")
            .style("z-index", "15")
            .style("visibility", "hidden")
            .style('font-size', '0.8em')
            .style('text-align', 'center');

        specialYrs = ['1997', '2001', '2003', '2008', '2009'];
        specialInfo = {
            '1997': "1997: Congress stopped funding for U.S. Travel and Tourism Advisory Board (USTTAB) that promoted US Tourism",
            '2001': "2001: 9/11 Incident",
            '2003': "2003: Congress re-established the U.S. Travel and Tourism Advisory Board (USTTAB)",
            '2008': "2008: Financial Crisis",
            '2009': "2009: Lawmakers established a public-private entity to promote U.S. tourism, the Corporation for Trade Promotion, which does business as Brand USA"
        };

        specialDetails = {
            '1997': "In 1997 Congress dissolved the United States Travel and Tourism Administration (USTTA) which operated the country's official travel and" +
                "tourism offices worldwide and promoted United States as a tourist destination to international travelers. While the tourism industry saw" +
                "some decrease in tourism following the dissolvement of USTTA, it picked up soon after.",
            '2001': "2001: 9/11 Incident. The travel and tourism industry in the United States got heavily impacted due to the September 11 attacks. Tourism " +
                "within and to the United States fell steadily in the year and a half following the 9/11 attacks. In the first full week after flights resumed," +
                "passenger numbers fell by nearly 45 percent, from 9 million in the week before September 11 to 5 million.",
            '2003': "In an effort to boost the severely impacted tourism industry, in 2003, Congress restarted funding for travel promotion through the Consolidated " +
                "Appropriations Resolution and established the U.S. Travel and Tourism Advisory Board (USTTAB), which has been re-chartered several times, " +
                "most recently in September 2013.",
            '2008': "The next dip in tourism happened after the US financial crisis in 2008. While this drop was considerably milder than what had occurred " +
                "after the 9/11 attacks, 250,000 jobs were lost purely in the tourism industry. Travel prices also fell twice as fast in the 2008 " +
                "recession as they did after the 9/11 attacks.",
            '2009': "Presumably to cope up with the decline in tourism and the corresponding economic impact, US Federal Government and Lawmakers established " +
                "a public-private entity in 2009 to promote U.S. tourism, the Corporation for Trade Promotion, which does business as Brand USA. Brand USA, " +
                "which began operations in 2011, attributes 4.3 million incremental international visitors since 2013 to its marketing efforts."
        };

        var dataToDisplayOnMouseOver = {};
        var dataToDisplayOnClick = {};
        usaData.forEach(d => {
            if (specialYrs.indexOf(d.year) >= 0) {
                dataToDisplayOnMouseOver[d.year] = specialInfo[d.year];
                dataToDisplayOnClick[d.year] = specialDetails[d.year];
            } else {
                dataToDisplayOnMouseOver[d.year] = d.year;
                dataToDisplayOnClick[d.year] = '';
            }
        });

        var x = d3.scaleTime().range([chartMargin.left, (newChartWidth - chartMargin.right)]);
        var y = d3.scaleLinear().range([(height - chartMargin.bottom), chartMargin.top]);

        var line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.inbound))
            .curve(d3.curveNatural);

        // Scale the range of the data
        x.domain(d3.extent(usaData, d => d.year));
        max_visitors = d3.max(usaData, d => d.inbound);
        y.domain([0, Math.ceil(max_visitors / 1000000) * 1000000]); // round up to nearest million for a clean y-axis


        // Add variable to determine if data point clicked or not (so tooltip stays until second click)
        var clickFlag = false;

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

            }) // // make dots for 'special years' red to direct the readers' attention
            .style("fill", function (d) {
                if (specialYrs.indexOf(d.year) >= 0) {
                    return "red";
                } else {
                    return "blue";
                }

            })

            .on("mouseover", function (d) {
                if (!clickFlag) {
                    dataToDisplay = dataToDisplayOnMouseOver[d.year];

                    tooltip.html("<b><u>" + dataToDisplay + "</b></u>"
                        + "<br />" + 'International Visitors: ' + d.inbound.toLocaleString()); // show the year, any special information, & the # int'l visitors

                    return tooltip.transition().duration(tooltipDuration)
                        .style("visibility", "visible")
                        .style("top", (d3.event.pageY - 15) + "px")
                        .style("left", (d3.event.pageX + 10) + "px")
                        .style("background", "#eeeeee")
                        .style('padding', '10px')
                        .style('border', '2px solid grey')
                        .style('border-radius', '3px')
                        .style('width', '200px');
                }
            })

            .on("mouseout", function () {
                if (!clickFlag) {
                    return tooltip.style("visibility", "hidden");
                }
            })

            .on('click', d => {
                selectedYr = d.year;
                dataToDisplay = dataToDisplayOnClick[d.year];

                if (clickFlag) {
                    clickFlag = !clickFlag;
                    return tooltip.style("visibility", "hidden")
                } else {
                    if (dataToDisplay.length > 0) {
                        tooltip.html("<b><u>" + selectedYr + "</b></u>"
                            + "<br />" + dataToDisplay); // show the long text for that year

                        clickFlag = !clickFlag;
                        return tooltip.transition().duration(tooltipDuration)
                            .style("visibility", "visible")
                            .style("top", (d3.event.pageY - dataToDisplay.length / 15) + "px")
                            .style("left", (400 + newChartWidth) + "px")
                            .style('width', (chartMargin.right * 1.9 + textWidth) + "px")
                            .style("background", "#ffffff")
                            .style('padding', '10px')
                            .style('border', '0px solid grey')
                            .style('border-radius', '0px')
                    }
                }
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

    function showInteractiveMap() {
        g.selectAll('.area-chart,.map,.south-korea,.usaData, rect')
            .transition()
            .duration(600)
            .attr('opacity', 0);
        svg.selectAll("rect").remove()
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
                    .style("fill", "blue")

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