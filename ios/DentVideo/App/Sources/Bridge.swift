import Foundation
import DentVideoCore

/// Small re-exports so view files read naturally.
enum DentVideoCoreBridge {
    static func day(_ s: String) -> Date? { WeekBoard.day(s) }
}
