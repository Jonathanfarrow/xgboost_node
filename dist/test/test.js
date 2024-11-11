import xgboost from '../lib/xgboost.js';
async function testFlightPricePredictor() {
    console.log("Starting Flight Price Prediction Test...");
    // Sample flight data features:
    // [distance, departure_time, arrival_time, stops, airline_code, is_weekend]
    const trainingData = [
        [1200, 8, 10, 0, 1, 1], // Weekend direct flight, short distance
        [800, 14, 15, 1, 2, 0], // Weekday with 1 stop, shorter distance
        [2500, 10, 16, 2, 1, 0], // Weekday with 2 stops, long distance
        [1500, 7, 9, 0, 3, 1], // Weekend direct flight, medium distance
        [3000, 23, 6, 1, 2, 0], // Weekday with 1 stop, very long distance
    ];
    // Sample prices (labels) in dollars
    const prices = [
        250, // Short weekend direct flight
        180, // Short weekday flight with stop
        450, // Long weekday flight with stops
        300, // Medium weekend direct flight
        550 // Very long weekday flight with stop
    ];
    // XGBoost parameters
    const params = {
        'max_depth': 3,
        'eta': 0.1,
        'objective': 'reg:squarederror',
        'eval_metric': 'rmse',
        'seed': 0,
        'verbosity': 1,
        'nthread': 2
    };
    try {
        // Train the model
        console.log("Training model...");
        await xgboost.train(trainingData, prices, params);
        const savedSuccess = await xgboost.saveModel('modelair.xgb');
        // Test loading the model
        const loadSuccess = await xgboost.loadModel('modelair.xgb');
        // Test predictions
        const testFlights = [
            [1300, 9, 11, 0, 1, 1], // Similar to first flight but slightly longer
            [2700, 11, 18, 2, 1, 0],
            [1200, 8, 10, 0, 1, 1], // Similar to third flight but longer
        ];
        console.log("\nMaking predictions for test flights:");
        const predictions = await xgboost.predict(testFlights);
        console.log("\nPredicted prices for test flights:", predictions);
        predictions.forEach((price, index) => {
            console.log(`Flight ${index + 1}: $${Math.round(price)}`);
            console.log(`Features: Distance=${testFlights[index][0]}mi, ` +
                `Time=${testFlights[index][1]}:00-${testFlights[index][2]}:00, ` +
                `Stops=${testFlights[index][3]}, ` +
                `Airline=${testFlights[index][4]}, ` +
                `Weekend=${testFlights[index][5] ? 'Yes' : 'No'}`);
        });
    }
    catch (error) {
        console.error("Error during flight price prediction:", error);
    }
}
// Run the test
testFlightPricePredictor().catch(console.error);
