//begin script when window loads
//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    var attrArray = ["Total Population, 2018", "Total Population, 2010", "Total Population, 2000", "Population Density per Square Mile", "Median Age", "Per Capita Personal Income ($ Dollars)", "Median Household Income ($ Dollars)", "Total Personal Income ($ Thousands)"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 45,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 1100000]);

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth * 0.5,
			height = 460;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([1.82, 38.75])
            .rotate([79.18, 0, 0])
            .parallels([0.00, 25.00])
            .scale(9000.00)
            .translate([width / 2, height / 2]);
        
        var path = d3.geoPath()
            .projection(projection);
        

            
        //use Promise.all to parallelize asynchronous data loading
        var promises = [];    
        promises.push(d3.csv("data/Lab2Data_MD_CountyDemographics.csv")); //load attributes from csv    
        promises.push(d3.json("data/States.topojson")); //load background spatial data    
        promises.push(d3.json("data/MDCounties.topojson")); //load choropleth spatial data    
        Promise.all(promises).then(callback);

        function callback(data){

            var csvData = data[0];
                states = data[1];    
                maryland = data[2];
                
            setGraticule(map, path);

            //translate europe TopoJSON
            var USstates = topojson.feature(states, states.objects.States),
                marylandCounties = topojson.feature(maryland, maryland.objects.MDCounties).features;
            
                //add Europe countries to map
            var allStates = map.append("path")
                .datum(USstates)
                .attr("class", "states")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            marylandCounties = joinData(marylandCounties, csvData);
            
            //create the color scale
			var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(marylandCounties, map, path, colorScale);

            //add coordinated visualization to the map
			setChart(csvData, colorScale);

            createDropdown(csvData);
            //examine the results
            //console.log(USstates);
            //console.log(marylandCounties);
        };
    
    function setGraticule(map, path) {

		//graticule generator
		var graticule = d3.geoGraticule()
			.step([1, 1]); //place graticule lines every 5 degrees of longitude and latitude

		//create graticule background
		var gratBackground = map.append("path")
			.datum(graticule.outline()) //bind graticule background
			.attr("class", "gratBackground") //assign class for styling
			.attr("d", path) //project graticule

		//create graticule lines
		var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
			.data(graticule.lines()) //bind graticule lines to each element to be created
			.enter() //create an element for each datum
			.append("path") //append each element to the svg as a path element
			.attr("class", "gratLines") //assign class for styling
			.attr("d", path); //project graticule lines
	};

    function joinData(marylandCounties, csvData) {
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvCounty = csvData[i]; //the current region
            var csvKey = csvCounty.ALAND; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < marylandCounties.length; a++) {

                var geojsonProps = marylandCounties[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.ALAND; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {

                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvCounty[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return marylandCounties;
    };  

     //function to highlight enumeration units and bars
     function highlight(props){
        //change stroke
        var selected = d3.selectAll(".a" + props.ALAND)
            .style("stroke", "DeepPink")
            .style("stroke-width", "3");

        setLabel(props);
    };

    //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll(".a" + props.ALAND)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        
        d3.select(".infolabel").remove();
    };

    function setEnumerationUnits(marylandCounties, map, path, colorScale) {
		//draw front layer
		var counties = map.selectAll(".regions")
			.data(marylandCounties)
			.enter()
			.append("path")
			.attr("class", function (d) {
				return "regions a" + d.properties.ALAND;
			})
			.attr("d", path)
			.style("fill", function (d) {
				var value = d.properties[expressed];
				if (value) {
					return colorScale(d.properties[expressed]);
				} else {
					return "#ccc";
				}s
			})
            .on("mouseover", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        var desc = counties.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');
	};
    
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#ffffd4",
            "#fed98e",
            "#fe9929",
            "#d95f0e",
            "#993404",
        ];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    };

    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 45,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([463, 0])
            .domain([0, 1100000]);

        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar a" + d.ALAND;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function(event, d){
                highlight(d);
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
            })
            .on("mousemove", moveLabel);
        
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');
        
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 80)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed + " in each county");

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        updateChart(bars, csvData.length, colorScale);
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //initialize mix and max value of expressed attribute
		var maxValue = -99999
		var minValue = 99999

		//recolor enumeration units
		var regions = d3.
			selectAll(".regions").
			transition().duration(1000).
			style("fill", function (d) {
				var value = d.properties[expressed];
				if (value > maxValue)
					maxValue = value
				if (value < minValue)
					minValue = value
				if (value) {
					return colorScale(d.properties[expressed]);
				} else {
					return "#ccc";
				}
			});

		//adjust the yScale, based on min and max value
		yScale = d3.scaleLinear()
			.range([463, 0])
			.domain([0, maxValue * 1.1]);

		//apply update yScale to y axis
		var yAxis = d3.axisLeft()
			.scale(yScale);
		//update the y axis 
		var axis = d3.select(".axis")
			.transition()
			.duration(1000)
			.call(yAxis);

		//sort, resize, and recolor bars
		var bars = d3.selectAll(".bar")
			//Sort bars
			.sort(function (a, b) {
				return b[expressed] - a[expressed];
			})
			.transition() //add animation
			.delay(function (d, i) {
				return i * 20
			})
			.duration(500);

		updateChart(bars, csvData.length, colorScale);
    };
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#ccc";            
                }  
        });
        //at the bottom of updateChart()...add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " in each county");
    };
    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.ALAND + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.NAME + " County");

    };

    //Example 2.8 line 1...function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1; 

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

}})(); //last line of main.js
