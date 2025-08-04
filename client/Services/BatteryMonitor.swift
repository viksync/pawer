import Foundation
import IOKit.ps

class BatteryMonitor {
    static let shared = BatteryMonitor()
    
    private var timer: Timer?
    private var lastNotificationLevel: Int?
    private var cachedThreshold: Int = 0
    static let defaultPollingInterval: Double = 30.0
    static let defaultMaxThreshold: Double = 80.0

    private init() {
        UserDefaults.standard.register(defaults: [
            "pollingInterval": BatteryMonitor.defaultPollingInterval,
            "maxThreshold": BatteryMonitor.defaultMaxThreshold
        ])
        let interval = UserDefaults.standard.double(forKey: "pollingInterval")
        cachedThreshold = UserDefaults.standard.integer(forKey: "maxThreshold")

        checkBattery()
        timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) {
            _ in self.checkBattery()
        }
    }

    func updatePollingInterval(_ newInterval: TimeInterval) {
        timer?.invalidate()
        timer = nil

        timer = Timer.scheduledTimer(
            withTimeInterval: newInterval,
            repeats: true
        ) { _ in self.checkBattery()
        }
    }
    
    func updateCachedThreshold(_ newThreshold: Int) {
        cachedThreshold = newThreshold
    }

    private func checkBattery() {
        if let currentPercentage = getBatteryPercentage() {
            
            if currentPercentage >= cachedThreshold {
                if lastNotificationLevel != currentPercentage {
                    MacNotifications.shared.sendBatteryAlert(batteryLevel: currentPercentage)
                    lastNotificationLevel = currentPercentage
                }
            } else if currentPercentage < cachedThreshold {
                lastNotificationLevel = nil
            }
        }
    }

    private func getBatteryPercentage() -> Int? {
        let snapshot = IOPSCopyPowerSourcesInfo().takeRetainedValue()
        let snapshotString = String(describing: snapshot)

        let pattern = #"Current Capacity"\s*=\s*(\d+)"#

        if let regex = try? NSRegularExpression(pattern: pattern),
            let match = regex.firstMatch(
                in: snapshotString,
                range:
                    NSRange(snapshotString.startIndex..., in: snapshotString)),
            let range = Range(match.range(at: 1), in: snapshotString)
        {
            return Int(String(snapshotString[range]))
        }

        return nil
    }
}
