import SwiftUI

@main
struct PawerApp: App {
    init() {
        _ = MacNotifications.shared
        _ = BatteryMonitor.shared
    }

    var body: some Scene {
        MenuBarExtra("Pawer", systemImage: "cat") {
            ContentView()
        }
        .menuBarExtraStyle(.window)
    }
}
