import SwiftUI

struct ContentView: View {
    @AppStorage("maxThreshold") private var maxThreshold: Int = BatteryMonitor.defaultMaxThreshold
    @State private var showSettings: Bool = false

    var body: some View {

        if showSettings {
            SettingsView(showSettings: $showSettings)
        } else {

            VStack {
                Text("Threshold")
                .frame(maxWidth: .infinity, alignment: .leading)
                HStack {
                    Slider(
                        value: Binding(
                            get: { Double(maxThreshold) },
                            set: { maxThreshold = Int($0) }
                        ),
                        in: 0...100)
                        .onChange(of: maxThreshold) {
                            BatteryMonitor.shared.updateCachedThreshold(maxThreshold)
                        }
                    Text("\(maxThreshold)%")
                }
                .padding(.bottom, 15)
                
                HStack {
                    Button("Settings") {
                        showSettings.toggle()
                    }
                    Button("Quit") {
                        NSApplication.shared.terminate(nil)
                    }
                }
            }
            .padding(20)
        }
    }
}
